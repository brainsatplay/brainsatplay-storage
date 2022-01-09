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

export const parseDBData = (data,head,filename,hasend=true,parser=(lines,head)=>{}) => {
    let lines = data.split('\n'); 
    lines.shift(); 

    if(hasend === false) lines.pop(); //pop first and last rows if they are likely incomplete
    let result = parser(lines,head);
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

//Write CSV data in chunks to not overwhelm memory
export const writeToCSV = async (filename='sessionName',dir='/data') => {
    if (filename != ''){
        fs.stat(dir + '/' + filename, (e, stats) => {
            if (e) throw e;
            let filesize = stats.size;
            console.log(filesize)
            fs.open(dir + '/' + filename, 'r', (e, fd) => {
                if (e) throw e;
                let i = 0;
                let maxFileSize = this.state.data.fileSizeLimitMb * 1024 * 1024;
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