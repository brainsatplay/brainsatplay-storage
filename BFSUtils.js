import {CSV} from './csv'

let fsInited = false
import * as BrowserFS from 'browserfs'
export const fs = BrowserFS.BFSRequire('fs');
const BFSBuffer = BrowserFS.BFSRequire('buffer').Buffer;

//TODO:
//Generic reimplementation of reading/writing buffered objects from/to CSVs and IndexedDB


// ----------------------------- Generic Functions for BrowserFS -----------------------------
export const initFS = (oninit=()=>{}, onerror=()=>{}) => {
    if (fsInited) return true
    else {
    return new Promise (resolve => {
        let oldmfs = fs.getRootFS();
        BrowserFS.FileSystem.IndexedDB.Create({}, (e, rootForMfs) => {
            if (e) throw e;
            if (!rootForMfs) {
                onerror();
                throw new Error(`Error creating BrowserFS`);
            }
            BrowserFS.initialize(rootForMfs); //fs now usable with imports after this

        let p1 = _checkDirectoryExistence(fs, 'data')
        let p2 = _checkDirectoryExistence(fs, 'projects')
        let p3 = _checkDirectoryExistence(fs, 'extensions')
        let p4 = _checkDirectoryExistence(fs, 'settings')
        let p5 = _checkDirectoryExistence(fs, 'plugins')

        Promise.all([p1,p2, p3, p4, p5]).then((values) => {
            oninit();
            fsInited = true
            resolve(true)
        })
    })
})
    }
}

export const readFiles = async (path) => {
    if (!fsInited) await initFS()
    return new Promise(resolve => {
        fs.readdir(path, function(e, output) {
            resolve(output)
        });
    })
}

export const readFile = async (path) => {
    if (!fsInited) await initFS()
    return new Promise(resolve => {
        fs.readFile(path, function(e, output) {
            resolve(output)
        });
    })
}

export const saveFile = async (content, path) => {
    
    if (!fsInited) await initFS()
    // Assumes content is text
    return new Promise(async resolve => {

        await _checkDirectoryExistence(fs, path.split('/')[1])

        fs.writeFile(path,content,(e)=>{
            if(e) throw e;
            resolve(content)
        });
    })
}

let directories = {}
export const _checkDirectoryExistence = (fs, directory) => {
    return new Promise(resolve => {
        if (directories[directory] === 'exists' || directories[directory] === 'created'){
            resolve()
        } else {
            fs.exists(`/${directory}`, (exists) => {
                if (exists) {
                    directories[directory] = 'exists'
                    console.log(`/${directory} exists!`)
                    resolve();
                }
                else if (directories[directory] === 'creating'){
                    console.log(directory + ' is still being created.')
                }
                else {
                    console.log('creating ' + directory)
                    directories[directory] = 'creating'
                    fs.mkdir(directory, (err) => {
                        if (err) throw err;
                        directories[directory] = 'created'
                        setTimeout(resolve, 500)
                    });
                }

            });
        }
    });
}

export const getFilenames = (onload=(directory)=>{}, directory = '/data') => {
    fs.readdir(directory, (e, dir) => {
        if (e) throw e;
        if (dir) {
            console.log("files", dir);
            onload(dir);
        }
    });
}

export const getFileSize = (filename,dir='/data',onread=(size)=>{console.log(size);}) => {
    fs.stat(dir + '/' +filename,(e,stats) => {
        if(e) throw e;
        let filesize = stats.size;
        onread(filesize);
    });
}

export const writeFile = (filename, data, dir='/data', onwrite=(data)=>{}) => {
    fs.writeFile(dir+'/'+filename, data, (err) => {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
        onwrite(data);
    });
}

export const appendFile = (filename, data, dir='/data', onwrite=(data)=>{}) => {
    fs.appendFile(dir+'/'+filename, data, (err) => {
        if (err) throw err;
        console.log('The "data to append" was appended to file!');
        onwrite(data);
    });
}

export const deleteFile = (path="/data/" + 'sessionName', ondelete=listFiles) => {
    if (path != ''){
        fs.unlink(path, (e) => {
            if (e) console.error(e);
            ondelete();
        });
    } else {
        console.error('Path name is not defined')
    }
}


export const parseCSVData = (
    data,
    head,
    filename,
    hasend=true,
    parser=(lines,head,filename) => { //generic parser for CSV files
        let result = {filename:filename,head:head};
        let headers = head.split(',');
        for(let i = 0; i < lines.length; i++){
            let line = lines[i].split(',');
            for(let j = 0; j < line.length; j++){
                if(!result[headers[j]]) result[headers[j]]
                result[headers[j]] = line[j];
            }
        }
    
        return result; 
    
    }
) => {
    let lines = data.split('\n'); 
    lines.shift(); 

    if(hasend === false) lines.pop(); //pop first and last rows if they are likely incomplete
    let result = parser(lines,head,filename);
    return result;
}

export const readFileAsText = (path, onread=(data,filename)=>{console.log(filename,data);}) => {
    fs.open(path, 'r', (e, fd) => {
        if (e) throw e;
        fs.read(fd, end, begin, 'utf-8', (er, output, bytesRead) => {
            if (er) throw er;
            if (bytesRead !== 0) {
                let data = output.toString();
                //Now parse the data back into the buffers.
                fs.close(fd, () => {
                    onread(data,filename);
                });
            };
        });
    });
}


export const getCSVHeader = (filename='', dir='/data', onopen=(header, filename)=>{console.log(header,filename);}) => {
    fs.open(dir + '/' +filename,'r',(e,fd) => {
        if(e) throw e;
        fs.read(fd,65535,0,'utf-8',(er,output,bytesRead) => {  //could be a really long header for all we know
            if (er) throw er;
            if(bytesRead !== 0) {
                let data = output.toString();
                let lines = data.split('\n');
                let header = lines[0];
                //Now parse the data back into the buffers.
                fs.close(fd,()=>{   
                    onopen(header, filename);
                });
            };
        }); 
    });
}

//
export const listFiles = (dir='/data', onload=(directory)=>{},fs_html_id=undefined) => {
    fs.readdir(dir, (e, directory) => {
        if (e) throw e;
        if (directory) {
            console.log("files", directory);
            onload(directory);
            if(fs_html_id){
                let filediv = document.getElementById(fs_html_id);
                filediv.innerHTML = "";
                directory.forEach((str, i) => {
                    if (str !== "settings.json") {
                        filediv.innerHTML += file_template({ id: str });
                    }
                });
                directory.forEach((str, i) => {
                    if (str !== "settings.json") {
                        document.getElementById(str + "svg").onclick = () => {
                            console.log(str);
                            writeToCSV(str);
                        }
                        document.getElementById(str + "delete").onclick = () => {
                            deleteFile(dir + '/' + str);
                        }
                    }
                });
            }
        }
    });
}

//pass an object with settings and data to process into CSV format
/**
 * option format:
 * {
 *  filename: 'filename',
 *  save: true, //will write a local CSV
 *  write:true, //will write to indexedDB, appending a file if it already exists
 *  dir: '/data', //directory if you want to save with browserfs
 *  header: ['timestamp','UTC','FP1','etc'],
 *  data: [{ //order of data is order of columns 
 *      x: [], //e.g. utc times. Used to create rows of data with the first column set to this
 *      timestamp: [], //e.g. ISO timestamps
 *      FP1; [1,2,3,4,5] //e.g.  filtered or raw data
 *    },
 *    {
 *      x: [], //e.g. utc times. Will splice rows with different timings into the same CSV
 *      timestamp: [], //e.g. ISO timestamps     
 *      FP1_FFT: [[0,1,2,3],[...],...], //e.g. periodic FFT data with different timing. Arrays of arrays get multiple columns
 *      FP2:[etc],...   
 *    }]
 *  }
 * }
 * 
 * result: [
 *  'timestamp,UTC,FP1,FP1_FFT,...,\n',
 *  '2012-12-12T12:12:12.000Z,123456,12345,123,...,\n',
 * ]
 * 
 */
//spits out an array of CSV rows in string format with endlines added
export const processDataForCSV = (options={}) => {
    let header = '';
    let headeridx = 0;
    let lines = {}; //associative array (e.g. timestamp = row)
    options.data.forEach((obj, i) => {
        if(Array.isArray(obj)) { //unstructured data just gets pushed into a column
            for(let j = 0; j < obj.length; j++) {
                if(!lines[j]) lines[j] = '';
                
                if(Array.isArray(obj[j])) {
                    if(j === 0) header[headeridx] += options.header[headeridx]+new Array(obj[j].length-1).fill('').join(','); //add empty spaces
                    lines[j] += obj[j].join(',') + ',';
                    headeridx+=obj[j].length;
                }
                else {
                    if(j === 0) header[headeridx] += options.header[headeridx]+',';
                    lines[j] += obj[j] + ',';
                    headeridx++;
                }
            }
        } else if (typeof obj === 'object'){
            let x;
            if(obj.x) {
               x = obj.x; 
               header[headeridx] = 'x,';
            } else if (obj.timestamp) {
                x = obj.timestamp;
                header[headeridx] = 'timestamp,localtime,'
            }
            for(let j = 0; j < x.length; j++) {
                
                if(!lines[x[j]]) lines[x[j]] = x[j] + ',';
                if(obj.timestamp) {
                    lines[x[j]] += toISOLocal(obj.timestamp[j]) + ',';
                } 

                for(const prop in obj) {
                    if(prop !== 'x') {
                        if(!lines[x[j]]) lines[x[j]] = '';
                
                        if(Array.isArray(obj[prop][j])) {
                            if(j === 0) header[headeridx] += options.header[headeridx]+Array(obj[prop][j].length-1).fill('').join(','); //add empty spaces
                            lines[x[j]] += obj[prop][j].join(',') + ',';
                            headeridx+=obj[prop][j].length;
                        }
                        else {
                            if(j === 0) header[headeridx] += options.header[headeridx]+',';
                            lines[x[j]] += obj[prop][j] + ',';
                            headeridx++;
                        }
                    }
                }
            }  
        }
    });

    header.splice(header.length-1,1); //remove last comma
    header += '\n';

    let joined = '';

    for(const prop in lines) {
        lines[prop].splice(lines[prop].length-1,1); //splice off the trailing comma
        joined +=  lines[prop] + '\n'; //add a newline
    }

    let result = {filename:options.filename,header:header,body:joined};

    if(options.save) {
        CSV.saveCSV(header+joined,options.filename);
    }

    if(options.write) {
        fs.exists(options.filename, (exists) => {
            if(exists) 
                appendFile(options.filename, joined, options.dir);
            else
                appendFile(options.filename, header+joined, options.dir);
        });
    }

    return result;
}

//Write IndexedDB data into a CSV, in chunks to not overwhelm memory. This is for pre-processed data
export const writeToCSV = async (filename='sessionName',dir='/data',fileSizeLimitMb=10) => {
    if (filename != ''){
        fs.stat(dir + '/' + filename, (e, stats) => {
            if (e) throw e;
            let filesize = stats.size;
            console.log(filesize)
            fs.open(dir + '/' + filename, 'r', (e, fd) => {
                if (e) throw e;
                let i = 0;
                let maxFileSize = fileSizeLimitMb * 1024 * 1024;
                let end = maxFileSize;
                if (filesize < maxFileSize) {
                    end = filesize;
                    fs.read(fd, end, 0, 'utf-8', (e, output, bytesRead) => {
                        if (e) throw e;
                        if (bytesRead !== 0) CSV.saveCSV(output.toString(), filename);
                        fs.close(fd);
                    });
                }
                else {
                    const writeChunkToFile = async () => {
                        if (i < filesize) {
                            if (i + end > filesize) { end = filesize - i; }
                            let chunk = 0;
                            fs.read(fd, end, i, 'utf-8', (e, output, bytesRead) => {
                                if (e) throw e;
                                if (bytesRead !== 0) {
                                    CSV.saveCSV(output.toString(), filename + "_" + chunk);
                                    i += maxFileSize;
                                    chunk++;
                                    writeChunkToFile();
                                    fs.close(fd);
                                }
                            });
                        }
                    }
                }
                //let file = fs.createWriteStream('./'+State.data.sessionName+'.csv');
                //file.write(data.toString());
            });
        });
    } else {
        console.error('File name is not defined.')
    }
}


export function toISOLocal(d) { //pass in a new Date(utc timestamp) object
    var z  = n =>  ('0' + n).slice(-2);
    var zz = n => ('00' + n).slice(-3);
    var off = d.getTimezoneOffset();
    var sign = off < 0? '+' : '-';
    off = Math.abs(off);
  
    return d.getFullYear() + '-' //https://stackoverflow.com/questions/49330139/date-toisostring-but-local-time-instead-of-utc
           + z(d.getMonth()+1) + '-' +
           z(d.getDate()) + 'T' +
           z(d.getHours()) + ':'  + 
           z(d.getMinutes()) + ':' +
           z(d.getSeconds()) + '.' +
           zz(d.getMilliseconds()) + 
           "(UTC" + sign + z(off/60|0) + ':00)'
}