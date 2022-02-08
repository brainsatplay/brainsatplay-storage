import { CSV } from ".";

const minimongo = require("minimongo");


//db default instantiated to local DB, preferably IndexedDB
export let db; 
try {
    db = new minimongo.IndexedDb()
} catch(err) {
    try {
        db = new minimongo.LocalStorageDb()
    } catch (err2) {
        try {
            db = new minimongo.MemoryDb();
        } catch (err3) {
            console.error('No DB created!');
        }
    }
}

//create a remote db
export const remoteDB = (db,url,client,httpclient,useQuickFind,usePostFind) => {
    db = new minimongo.RemoteDb(url,client,httpclient,useQuickFind,usePostFind);
    return db;
} 

//replaces the input db with a hybrid db
export const connectDB = (db,url,client,httpclient,useQuickFind,usePostFind) => {
    let remote = new minimongo.RemoteDb(url,client,httpclient,useQuickFind,usePostFind)
    db = new minimongo.HybridDb(db, remote); //locally accessible, and lazy loads from DB
    return db;
}

export const readData = (collection='',query={}) => {
    if(!collection) return undefined;
    if(!db[collection]) db.addCollection(collection);

    return db[collection].findOne(query);
}

export const writeData = (collection,data={},onsuccess=(doc)=>{}, onerror=(err)=>{}) => {
    if(!collection) return undefined;
    if(!db[collection]) db.addCollection(collection);

    db[collection].upsert(data,onsuccess, onerror);
}

export const readFile = (collection, filename='', thisArg) => {
    if(!db[collection]) return undefined;
    let query = {filename}
    return db[collection].find(query,thisArg);
}

export const readFileChunk = (collection, filename='', chunk=0, onsuccess=(doc)=>{}, onerror=(err)=>{}, findOneOptions) => {
    if(!db[collection]) return undefined;
    let query = {filename, chunk}
    return db[collection].findOne(query,findOneOptions,onsuccess,onerror);
}

export const writeFile = async (collection, filename='', data, onsuccess=(doc)=>{}, onerror=(err)=>{}, props={}, filetype='text/plain', chunkSize=256000) => {
    let found = db[collection].find({filename});

    if(await found.count() > 0) {
        await Promise.all(found.map(async (s) => {
            db[collection].remove(s._id);
        }));
    }

    let file = {filename, data: new Blob([data],{filetype:filetype})};
    Object.assign(file,props);

    if(file.data.size > chunkSize) {
        const size = file.data.size;
        let written = 0;
        let i = 0;
        while(written < size) {
            let end = written+chunkSize;
            if(end > size) end = size;

            let slice = undefined;
            if(filetype === 'text/plain')  { 
                slice = await file.data.slice(written,end).text();
            } else {
                slice = await file.data.slice(written,end).arrayBuffer();
            }
            if(slice) {
                let chunk = {filename, data: new Blob([slice],{type:filetype}), chunk:i, start:written, end:end};
                Object.assign(chunk,props);
                db[collection].upsert(chunk,onsuccess,onerror);
            }

            written += chunkSize;
            i++;
        }
    } else db[collection].upsert(file, onsuccess, onerror);

}

//add the chunk to the end. This is represented as different objects
export const appendFile = async (collection, filename='', data, onsuccess=(doc)=>{}, onerror=(err)=>{}, props={}, filetype='text/plain', chunkSize=256000) => {
    let found = db[collection].find({filename});

    let ct = await found.count();
    let size = 0;

    let file = {filename, data: new Blob([data],{filetype:filetype})};
    Object.assign(file,props);

    if(ct > 0) {
        await Promise.all(found.map(async (s) => {
            size += s.size;
        }));
        

        if(file.data.size > chunkSize) {
            let written = size;
            let i = ct;
            while(written < file.data.size + size) {
                let end = written+chunkSize;
                if(end > size) end = size;

                let slice = undefined;
                if(filetype === 'text/plain')  { 
                    slice = await file.data.slice(written,end).text();
                } else {
                    slice = await file.data.slice(written,end).arrayBuffer();
                }
                if(slice) {
                    let chunk = {filename, data: new Blob([slice],{type:filetype}), chunk:i, start:written, end:end, size:end-written};
                    Object.assign(chunk,props);
                    db[collection].upsert(chunk,onsuccess,onerror);
                }

                written += chunkSize;
                i++;
            }
        } else {
            file.chunk = ct; file.start = size; file.end = size+file.data.size;
            db[collection].upsert(file, onsuccess, onerror);
        }
    } else {    
        db[collection].upsert(file, onsuccess, onerror);
    }
}

export const getFilenames = async (collection) => {
    let found = db[collection].find();
    let filenames = [];
    let ct = await found.count();
    if(ct > 0) {
        await Promise.all(found.map(async (s) => {
            if(typeof s.chunk !== 'undefined') {
                if(s.chunk === 0) {
                    filenames.push(s.filename)
                }
            } else filenames.push(s.filename);
        }));   
    }
    
    return filenames;
}

export const listFiles = getFilenames;

export const getFileSize = async (collection, filename) => {
    let found = db[collection].find({filename});

    let ct = await found.count();
    let size = 0;

    if(ct > 0) {
        await Promise.all(found.map(async (s) => {
            size += s.size;
        }));
    }

    return size;
}

export const deleteFile = async (collection, query) => {
    return await db[collection].remove(query);
}


export const writeToCSVFromDB = (collection, filename) => {
    let text = await readFileAsText(collection, filename);

    //now save to CSV (assuming it's already processed into CSV data)
    CSV.saveCSV(text,filename);
}

export const getCSVHeader = (collection, filename) => {
    let found = db[collection].find({filename});
    let result;
    let ct = await found.count();
    if(ct > 0) {
        await Promise.all(found.map(async (s) => {
            if(typeof s.chunk !== 'undefined') {
                if(s.chunk === 0) {
                    let text = await s.data.text();
                    result = text.substring(0,text.indexOf('\n')); //get header of the text off the first slice
                }
            } 
        }));   
    }
    
    return result;
}

export const readFileAsText = async (collection, filename) => {
    let found = db[collection].find({filename});
    let result;
    let ct = await found.count();
    if(ct > 0) {
        let chunks = {};
        await Promise.all(found.map(async (s) => {
            let text = await s.data.text();
            if(typeof s.chunk !== 'undefined') {
                chunks[s.chunk] = text; //get possibly unordered chunks
            } else chunks[0] = text;
        }));   
        let l = Object.keys(chunks).length;
        for(let i = 0; i < l; i++) {
            result += chunks[i];
        }
    }
    
    return result;
}