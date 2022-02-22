import { CSV } from './csv';
let fsInited = false;
import * as BrowserFS from 'browserfs';
export const fs = BrowserFS.BFSRequire('fs');
const BFSBuffer = BrowserFS.BFSRequire('buffer').Buffer;
//TODO:
//Generic reimplementation of reading/writing buffered objects from/to CSVs and IndexedDB
// ----------------------------- Generic Functions for BrowserFS -----------------------------
export const initFS = async (oninit = () => { }, onerror = () => { }) => {
    if (fsInited)
        return true;
    else {
        return new Promise(resolve => {
            let oldmfs = fs.getRootFS();
            BrowserFS.FileSystem.IndexedDB.Create({}, (e, rootForMfs) => {
                if (e)
                    throw e;
                if (!rootForMfs) {
                    onerror();
                    throw new Error(`Error creating BrowserFS`);
                }
                BrowserFS.initialize(rootForMfs); //fs now usable with imports after this
                let p1 = _checkDirectoryExistence(fs, 'data');
                let p2 = _checkDirectoryExistence(fs, 'projects');
                let p3 = _checkDirectoryExistence(fs, 'extensions');
                let p4 = _checkDirectoryExistence(fs, 'settings');
                let p5 = _checkDirectoryExistence(fs, 'plugins');
                Promise.all([p1, p2, p3, p4, p5]).then((values) => {
                    oninit();
                    fsInited = true;
                    resolve(true);
                });
            });
        });
    }
};
export const readFile = async (filename = 'sessionName', dir = 'data') => {
    if (!fsInited)
        await initFS();
    return new Promise(resolve => {
        fs.readFile('/' + dir + '/' + filename, function (e, output) {
            resolve(output);
        });
    });
};
export async function readFileChunk(filename = 'sessionName', dir = 'data', begin = 0, end = 5120, onread = (data) => { }) {
    if (filename != '') {
        return new Promise(async (resolve) => {
            fs.open('/' + dir + '/' + filename, 'r', (e, fd) => {
                if (e)
                    throw e;
                fs.read(fd, end, begin, 'utf-8', (er, output, bytesRead) => {
                    if (er)
                        throw er;
                    if (bytesRead !== 0) {
                        let data = output.toString();
                        //Now parse the data back into the buffers.
                        fs.close(fd, () => {
                            onread(data, filename);
                            resolve(data);
                        });
                    }
                });
            });
        });
    }
    else {
        console.error('Path name is not defined');
        return undefined;
    }
}
export const saveFile = async (content, filename = 'sessionName', dir = 'data') => {
    if (!fsInited)
        await initFS();
    // Assumes content is text
    return new Promise(async (resolve) => {
        await _checkDirectoryExistence(fs, dir);
        fs.writeFile('/' + dir + '/' + filename, content, (e) => {
            if (e)
                throw e;
            resolve(content);
        });
    });
};
let directories = {};
export const _checkDirectoryExistence = async (fs, directory) => {
    return new Promise(resolve => {
        if (directories[directory] === 'exists' || directories[directory] === 'created') {
            resolve();
        }
        else {
            fs.exists(`/${directory}`, (exists) => {
                if (exists) {
                    directories[directory] = 'exists';
                    console.log(`/${directory} exists!`);
                    resolve();
                }
                else if (directories[directory] === 'creating') {
                    console.log(directory + ' is still being created.');
                }
                else {
                    console.log('creating ' + directory);
                    directories[directory] = 'creating';
                    fs.mkdir(directory, (err) => {
                        if (err)
                            throw err;
                        directories[directory] = 'created';
                        setTimeout(resolve, 500);
                    });
                }
            });
        }
    });
};
export const getFilenames = (onload = (directory) => { }, directory = '/data') => {
    return new Promise(resolve => {
        fs.readdir(directory, (e, dir) => {
            if (e)
                throw e;
            if (dir) {
                console.log("files", dir);
                onload(dir);
                resolve(dir);
            }
        });
    });
};
export const getFileSize = async (filename, dir = 'data', onread = (size) => { console.log(size); }) => {
    return new Promise(resolve => {
        fs.stat('/' + dir + '/' + filename, (e, stats) => {
            if (e)
                throw e;
            let filesize = stats.size;
            onread(filesize);
            resolve(filesize);
        });
    });
};
export const writeFile = async (filename, data, dir = 'data', onwrite = (data) => { }) => {
    return new Promise(resolve => {
        fs.writeFile('/' + dir + '/' + filename, data, (err) => {
            if (err)
                throw err;
            console.log('The "data to append" was appended to file!');
            onwrite(data);
            resolve(true);
        });
    });
};
export const appendFile = async (filename, data, dir = 'data', onwrite = (data) => { }) => {
    return new Promise(resolve => {
        fs.appendFile('/' + dir + '/' + filename, data, (err) => {
            if (err)
                throw err;
            console.log('The "data to append" was appended to file!');
            onwrite(data);
            resolve(true);
        });
    });
};
export const deleteFile = (filename = 'sessionName', dir = 'data', ondelete = listFiles) => {
    return new Promise(resolve => {
        if (filename != '') {
            fs.unlink('/' + dir + '/' + filename, (e) => {
                if (e)
                    console.error(e);
                ondelete();
                resolve(true);
            });
        }
        else {
            console.error('Path name is not defined');
            resolve(false);
        }
    });
};
//read a browserfs file
export const readFileAsText = async (filename = 'sessionName.csv', dir = 'data', onread = (data, filename) => { console.log(filename, data); }) => {
    return new Promise(resolve => {
        fs.open('/' + dir + '/' + filename, 'r', (e, fd) => {
            if (e)
                throw e;
            fs.read(fd, end, begin, 'utf-8', (er, output, bytesRead) => {
                if (er)
                    throw er;
                if (bytesRead !== 0) {
                    let data = output.toString();
                    //Now parse the data back into the buffers.
                    fs.close(fd, () => {
                        onread(data, filename);
                        resolve(data);
                    });
                }
                ;
            });
        });
    });
};
export const getCSVHeader = async (filename = '', dir = 'data', onopen = (header, filename) => { console.log(header, filename); }) => {
    return new Promise(resolve => {
        fs.open('/' + dir + '/' + filename, 'r', (e, fd) => {
            if (e)
                throw e;
            fs.read(fd, 65535, 0, 'utf-8', (er, output, bytesRead) => {
                if (er)
                    throw er;
                if (bytesRead !== 0) {
                    let data = output.toString();
                    let lines = data.split('\n');
                    let header = lines[0];
                    //Now parse the data back into the buffers.
                    fs.close(fd, () => {
                        onopen(header, filename);
                        resolve(header);
                    });
                }
                ;
            });
        });
    });
};
//
export const listFiles = async (dir = 'data', onload = (directory) => { }, fs_html_id = undefined) => {
    return new Promise(resolve => {
        fs.readdir('/' + dir, (e, directory) => {
            if (e)
                throw e;
            if (directory) {
                console.log("files", directory);
                onload(directory);
                // if(fs_html_id){
                //     let filediv = document.getElementById(fs_html_id);
                //     filediv.innerHTML = "";
                //     directory.forEach((str, i) => {
                //         if (str !== "settings.json") {
                //             filediv.innerHTML += file_template({ id: str });
                //         }
                //     });
                //     directory.forEach((str, i) => {
                //         if (str !== "settings.json") {
                //             document.getElementById(str + "svg").onclick = () => {
                //                 console.log(str);
                //                 writeToCSV(str);
                //             }
                //             document.getElementById(str + "delete").onclick = () => {
                //                 deleteFile(dir + '/' + str);
                //             }
                //         }
                //     });
                // } 
            }
            resolve(directory);
        });
    });
};
//Write IndexedDB data (preprocessed) into a CSV, in chunks to not overwhelm memory. This is for pre-processed data
export const writeToCSVFromDB = async (filename = 'sessionName', dir = 'data', fileSizeLimitMb = 10) => {
    return new Promise(resolve => {
        if (filename != '') {
            fs.stat('/' + dir + '/' + filename, (e, stats) => {
                if (e)
                    throw e;
                let filesize = stats.size;
                console.log(filesize);
                fs.open(dir + '/' + filename, 'r', (e, fd) => {
                    if (e)
                        throw e;
                    let i = 0;
                    let maxFileSize = fileSizeLimitMb * 1024 * 1024;
                    let end = maxFileSize;
                    if (filesize < maxFileSize) {
                        end = filesize;
                        fs.read(fd, end, 0, 'utf-8', (e, output, bytesRead) => {
                            if (e)
                                throw e;
                            if (bytesRead !== 0)
                                CSV.saveCSV(output.toString(), filename);
                            fs.close(fd);
                            resolve(true);
                        });
                    }
                    else {
                        const writeChunkToFile = async () => {
                            if (i < filesize) {
                                if (i + end > filesize) {
                                    end = filesize - i;
                                }
                                let chunk = 0;
                                fs.read(fd, end, i, 'utf-8', (e, output, bytesRead) => {
                                    if (e)
                                        throw e;
                                    if (bytesRead !== 0) {
                                        CSV.saveCSV(output.toString(), filename + "_" + chunk);
                                        i += maxFileSize;
                                        chunk++;
                                        writeChunkToFile();
                                        fs.close(fd);
                                        resolve(true);
                                    }
                                });
                            }
                        };
                    }
                    //let file = fs.createWriteStream('./'+State.data.sessionName+'.csv');
                    //file.write(data.toString());
                });
            });
        }
        else {
            console.error('File name is not defined.');
            resolve(false);
        }
    });
};
//returns an object with the headers and correctly sized outputs (e.g. single values or arrays pushed in columns)
export async function readCSVChunkFromDB(filename, dir = 'data', start = 0, end = 'end') {
    let head = await getCSVHeader(filename);
    if (head)
        head = head.split(',');
    else
        return undefined;
    let resultLengths = [];
    let resultNames = [];
    let results = {};
    head.forEach((v) => {
        if (v) {
            resultNames.push(v);
            resultLengths.push(1);
        }
        else
            resultLengths[resultLengths.length - 1]++;
    });
    let size = await getFileSize(filename, dir);
    if (end === 'end')
        end = size;
    else if (end > size) {
        start = size - (end - start);
        end = size;
    }
    let data = await readFileChunk(filename, dir, start, end);
    let headeridx = 0;
    let lastIdx = 0;
    data.forEach((r, i) => {
        let row = r.split(',');
        while (lastIdx < row.length - 1) {
            let l = resultLengths[headeridx];
            if (l === 1) {
                results[resultNames[headeridx]].push(row[lastIdx]);
                lastIdx++;
            }
            else {
                results[resultNames[headeridx]].push(row[lastIdx].slice(lastIdx, l));
                lastIdx += l;
            }
        }
    });
    return results;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiQkZTVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvQkZTVXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLE9BQU8sQ0FBQTtBQUV6QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUE7QUFDcEIsT0FBTyxLQUFLLFNBQVMsTUFBTSxXQUFXLENBQUE7QUFDdEMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDN0MsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFFeEQsT0FBTztBQUNQLHlGQUF5RjtBQUd6Riw4RkFBOEY7QUFDOUYsTUFBTSxDQUFDLE1BQU0sTUFBTSxHQUFHLEtBQUssRUFBRSxNQUFNLEdBQUMsR0FBRSxFQUFFLEdBQUMsQ0FBQyxFQUFFLE9BQU8sR0FBQyxHQUFFLEVBQUUsR0FBQyxDQUFDLEVBQUUsRUFBRTtJQUMxRCxJQUFJLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQTtTQUNwQjtRQUNMLE9BQU8sSUFBSSxPQUFPLENBQUUsT0FBTyxDQUFDLEVBQUU7WUFDMUIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUU7Z0JBQ3hELElBQUksQ0FBQztvQkFBRSxNQUFNLENBQUMsQ0FBQztnQkFDZixJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNiLE9BQU8sRUFBRSxDQUFDO29CQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztpQkFDL0M7Z0JBQ0QsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLHVDQUF1QztnQkFFN0UsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQ2pELElBQUksRUFBRSxHQUFHLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQTtnQkFDbkQsSUFBSSxFQUFFLEdBQUcsd0JBQXdCLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLEVBQUUsR0FBRyx3QkFBd0IsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBRWhELE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEVBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDN0MsTUFBTSxFQUFFLENBQUM7b0JBQ1QsUUFBUSxHQUFHLElBQUksQ0FBQTtvQkFDZixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLENBQUMsQ0FBQyxDQUFBO1lBQ04sQ0FBQyxDQUFDLENBQUE7UUFDTixDQUFDLENBQUMsQ0FBQTtLQUNHO0FBQ0wsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxRQUFRLEdBQUMsYUFBYSxFQUFDLEdBQUcsR0FBQyxNQUFNLEVBQUUsRUFBRTtJQUNoRSxJQUFJLENBQUMsUUFBUTtRQUFFLE1BQU0sTUFBTSxFQUFFLENBQUE7SUFDN0IsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN6QixFQUFFLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLFFBQVEsRUFBRSxVQUFTLENBQUMsRUFBRSxNQUFNO1lBQ2hELE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuQixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFBO0FBQ04sQ0FBQyxDQUFBO0FBR0QsTUFBTSxDQUFDLEtBQUssVUFBVSxhQUFhLENBQUUsUUFBUSxHQUFDLGFBQWEsRUFBRSxHQUFHLEdBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLElBQUksRUFBRSxNQUFNLEdBQUMsQ0FBQyxJQUFJLEVBQUMsRUFBRSxHQUFDLENBQUM7SUFHN0csSUFBSSxRQUFRLElBQUksRUFBRSxFQUFDO1FBQ2YsT0FBTyxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUMsT0FBTyxFQUFDLEVBQUU7WUFDL0IsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLEdBQUcsR0FBRyxRQUFRLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFO2dCQUMzQyxJQUFJLENBQUM7b0JBQUUsTUFBTSxDQUFDLENBQUM7Z0JBRWYsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO29CQUN2RCxJQUFJLEVBQUU7d0JBQUUsTUFBTSxFQUFFLENBQUM7b0JBQ2pCLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRTt3QkFDakIsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUNqQywyQ0FBMkM7d0JBQ3ZDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRTs0QkFDZCxNQUFNLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFDOzRCQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLENBQUMsQ0FBQyxDQUFDO3FCQUNOO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUMsQ0FBQztLQUNOO1NBQU07UUFDSCxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDekMsT0FBTyxTQUFTLENBQUM7S0FDcEI7QUFDTCxDQUFDO0FBRUQsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLEtBQUssRUFBRSxPQUFPLEVBQUUsUUFBUSxHQUFDLGFBQWEsRUFBQyxHQUFHLEdBQUMsTUFBTSxFQUFFLEVBQUU7SUFFekUsSUFBSSxDQUFDLFFBQVE7UUFBRSxNQUFNLE1BQU0sRUFBRSxDQUFBO0lBQzdCLDBCQUEwQjtJQUMxQixPQUFPLElBQUksT0FBTyxDQUFDLEtBQUssRUFBQyxPQUFPLEVBQUMsRUFBRTtRQUUvQixNQUFNLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUV2QyxFQUFFLENBQUMsU0FBUyxDQUFDLEdBQUcsR0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLFFBQVEsRUFBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLEVBQUMsRUFBRTtZQUMzQyxJQUFHLENBQUM7Z0JBQUUsTUFBTSxDQUFDLENBQUM7WUFDZCxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQTtBQUNOLENBQUMsQ0FBQTtBQUVELElBQUksV0FBVyxHQUFHLEVBQUUsQ0FBQztBQUNyQixNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxLQUFLLEVBQUUsRUFBRSxFQUFFLFNBQVMsRUFBRSxFQUFFO0lBQzVELE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDekIsSUFBSSxXQUFXLENBQUMsU0FBUyxDQUFDLEtBQUssUUFBUSxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxTQUFTLEVBQUM7WUFDNUUsT0FBTyxFQUFFLENBQUE7U0FDWjthQUFNO1lBQ0gsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLFNBQVMsRUFBRSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2xDLElBQUksTUFBTSxFQUFFO29CQUNSLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxRQUFRLENBQUE7b0JBQ2pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxTQUFTLFVBQVUsQ0FBQyxDQUFBO29CQUNwQyxPQUFPLEVBQUUsQ0FBQztpQkFDYjtxQkFDSSxJQUFJLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxVQUFVLEVBQUM7b0JBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLDBCQUEwQixDQUFDLENBQUE7aUJBQ3REO3FCQUNJO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxHQUFHLFNBQVMsQ0FBQyxDQUFBO29CQUNwQyxXQUFXLENBQUMsU0FBUyxDQUFDLEdBQUcsVUFBVSxDQUFBO29CQUNuQyxFQUFFLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO3dCQUN4QixJQUFJLEdBQUc7NEJBQUUsTUFBTSxHQUFHLENBQUM7d0JBQ25CLFdBQVcsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUE7d0JBQ2xDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUE7b0JBQzVCLENBQUMsQ0FBQyxDQUFDO2lCQUNOO1lBRUwsQ0FBQyxDQUFDLENBQUM7U0FDTjtJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLENBQUMsTUFBTSxHQUFDLENBQUMsU0FBUyxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsU0FBUyxHQUFHLE9BQU8sRUFBRSxFQUFFO0lBQ3hFLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDekIsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDN0IsSUFBSSxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2YsSUFBSSxHQUFHLEVBQUU7Z0JBQ0wsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzFCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUMsR0FBRyxHQUFDLE1BQU0sRUFBQyxNQUFNLEdBQUMsQ0FBQyxJQUFJLEVBQUMsRUFBRSxHQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQSxDQUFDLEVBQUUsRUFBRTtJQUN6RixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3pCLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUUsUUFBUSxFQUFDLENBQUMsQ0FBQyxFQUFDLEtBQUssRUFBRSxFQUFFO1lBQ3hDLElBQUcsQ0FBQztnQkFBRSxNQUFNLENBQUMsQ0FBQztZQUNkLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDMUIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBQyxNQUFNLEVBQUUsT0FBTyxHQUFDLENBQUMsSUFBSSxFQUFDLEVBQUUsR0FBQyxDQUFDLEVBQUUsRUFBRTtJQUM5RSxPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFDLEdBQUcsR0FBQyxHQUFHLEdBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQzdDLElBQUksR0FBRztnQkFBRSxNQUFNLEdBQUcsQ0FBQztZQUNuQixPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7WUFDMUQsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2QsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFDLE1BQU0sRUFBRSxPQUFPLEdBQUMsQ0FBQyxJQUFJLEVBQUMsRUFBRSxHQUFDLENBQUMsRUFBRSxFQUFFO0lBQy9FLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDekIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLEdBQUcsR0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDOUMsSUFBSSxHQUFHO2dCQUFFLE1BQU0sR0FBRyxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztZQUMxRCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDZCxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxDQUFDLFFBQVEsR0FBQyxhQUFhLEVBQUUsR0FBRyxHQUFDLE1BQU0sRUFBRSxRQUFRLEdBQUMsU0FBUyxFQUFFLEVBQUU7SUFDakYsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN6QixJQUFJLFFBQVEsSUFBSSxFQUFFLEVBQUM7WUFDZixFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsR0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUNsQyxJQUFJLENBQUM7b0JBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xCLENBQUMsQ0FBQyxDQUFDO1NBQ047YUFBTTtZQUNILE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQTtZQUN6QyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbEI7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQTtBQUVELHVCQUF1QjtBQUN2QixNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsS0FBSyxFQUFFLFFBQVEsR0FBQyxpQkFBaUIsRUFBRSxHQUFHLEdBQUMsTUFBTSxFQUFFLE1BQU0sR0FBQyxDQUFDLElBQUksRUFBQyxRQUFRLEVBQUMsRUFBRSxHQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFDLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyxFQUFFLEVBQUU7SUFDbEksT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUN6QixFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDO2dCQUFFLE1BQU0sQ0FBQyxDQUFDO1lBQ2YsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUN2RCxJQUFJLEVBQUU7b0JBQUUsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLElBQUksU0FBUyxLQUFLLENBQUMsRUFBRTtvQkFDakIsSUFBSSxJQUFJLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUM3QiwyQ0FBMkM7b0JBQzNDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRTt3QkFDZCxNQUFNLENBQUMsSUFBSSxFQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUN0QixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2xCLENBQUMsQ0FBQyxDQUFDO2lCQUNOO2dCQUFBLENBQUM7WUFDTixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUE7QUFHRCxNQUFNLENBQUMsTUFBTSxZQUFZLEdBQUcsS0FBSyxFQUFFLFFBQVEsR0FBQyxFQUFFLEVBQUUsR0FBRyxHQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFDLEVBQUUsR0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBQyxRQUFRLENBQUMsQ0FBQyxDQUFBLENBQUMsRUFBRSxFQUFFO0lBRXRILE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDekIsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRSxRQUFRLEVBQUMsR0FBRyxFQUFDLENBQUMsQ0FBQyxFQUFDLEVBQUUsRUFBRSxFQUFFO1lBQ3pDLElBQUcsQ0FBQztnQkFBRSxNQUFNLENBQUMsQ0FBQztZQUNkLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFDLEtBQUssRUFBQyxDQUFDLEVBQUMsT0FBTyxFQUFDLENBQUMsRUFBRSxFQUFDLE1BQU0sRUFBQyxTQUFTLEVBQUUsRUFBRTtnQkFDL0MsSUFBSSxFQUFFO29CQUFFLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixJQUFHLFNBQVMsS0FBSyxDQUFDLEVBQUU7b0JBQ2hCLElBQUksSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFDN0IsSUFBSSxNQUFNLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUN0QiwyQ0FBMkM7b0JBQzNDLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFDLEdBQUUsRUFBRTt3QkFDWixNQUFNLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUN6QixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ3BCLENBQUMsQ0FBQyxDQUFDO2lCQUNOO2dCQUFBLENBQUM7WUFDTixDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ1AsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUE7QUFFRCxFQUFFO0FBQ0YsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLEtBQUssRUFBRSxHQUFHLEdBQUMsTUFBTSxFQUFFLE1BQU0sR0FBQyxDQUFDLFNBQVMsRUFBQyxFQUFFLEdBQUMsQ0FBQyxFQUFDLFVBQVUsR0FBQyxTQUFTLEVBQUUsRUFBRTtJQUN2RixPQUFPLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3pCLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxHQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsRUFBRTtZQUNqQyxJQUFJLENBQUM7Z0JBQUUsTUFBTSxDQUFDLENBQUM7WUFDZixJQUFJLFNBQVMsRUFBRTtnQkFDWCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFDaEMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUNsQixrQkFBa0I7Z0JBQ2xCLHlEQUF5RDtnQkFDekQsOEJBQThCO2dCQUM5QixzQ0FBc0M7Z0JBQ3RDLHlDQUF5QztnQkFDekMsK0RBQStEO2dCQUMvRCxZQUFZO2dCQUNaLFVBQVU7Z0JBQ1Ysc0NBQXNDO2dCQUN0Qyx5Q0FBeUM7Z0JBQ3pDLHFFQUFxRTtnQkFDckUsb0NBQW9DO2dCQUNwQyxtQ0FBbUM7Z0JBQ25DLGdCQUFnQjtnQkFDaEIsd0VBQXdFO2dCQUN4RSwrQ0FBK0M7Z0JBQy9DLGdCQUFnQjtnQkFDaEIsWUFBWTtnQkFDWixVQUFVO2dCQUNWLEtBQUs7YUFDUjtZQUNELE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QixDQUFDLENBQUMsQ0FBQztJQUNQLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFBO0FBRUQsbUhBQW1IO0FBQ25ILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLEtBQUssRUFBRSxRQUFRLEdBQUMsYUFBYSxFQUFDLEdBQUcsR0FBQyxNQUFNLEVBQUMsZUFBZSxHQUFDLEVBQUUsRUFBRSxFQUFFO0lBQzNGLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDN0IsSUFBSSxRQUFRLElBQUksRUFBRSxFQUFDO1lBQ2YsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsR0FBRyxHQUFHLEdBQUcsR0FBRyxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQzdDLElBQUksQ0FBQztvQkFBRSxNQUFNLENBQUMsQ0FBQztnQkFDZixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO2dCQUMxQixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO2dCQUNyQixFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxHQUFHLEdBQUcsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRTtvQkFDekMsSUFBSSxDQUFDO3dCQUFFLE1BQU0sQ0FBQyxDQUFDO29CQUNmLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDVixJQUFJLFdBQVcsR0FBRyxlQUFlLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEdBQUcsV0FBVyxDQUFDO29CQUN0QixJQUFJLFFBQVEsR0FBRyxXQUFXLEVBQUU7d0JBQ3hCLEdBQUcsR0FBRyxRQUFRLENBQUM7d0JBQ2YsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFOzRCQUNsRCxJQUFJLENBQUM7Z0NBQUUsTUFBTSxDQUFDLENBQUM7NEJBQ2YsSUFBSSxTQUFTLEtBQUssQ0FBQztnQ0FBRSxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLENBQUMsQ0FBQzs0QkFDOUQsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQzs0QkFDYixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ2xCLENBQUMsQ0FBQyxDQUFDO3FCQUNOO3lCQUNJO3dCQUNELE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxJQUFJLEVBQUU7NEJBQ2hDLElBQUksQ0FBQyxHQUFHLFFBQVEsRUFBRTtnQ0FDZCxJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsUUFBUSxFQUFFO29DQUFFLEdBQUcsR0FBRyxRQUFRLEdBQUcsQ0FBQyxDQUFDO2lDQUFFO2dDQUMvQyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7Z0NBQ2QsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFO29DQUNsRCxJQUFJLENBQUM7d0NBQUUsTUFBTSxDQUFDLENBQUM7b0NBQ2YsSUFBSSxTQUFTLEtBQUssQ0FBQyxFQUFFO3dDQUNqQixHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDO3dDQUN2RCxDQUFDLElBQUksV0FBVyxDQUFDO3dDQUNqQixLQUFLLEVBQUUsQ0FBQzt3Q0FDUixnQkFBZ0IsRUFBRSxDQUFDO3dDQUNuQixFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dDQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztxQ0FDakI7Z0NBQ0wsQ0FBQyxDQUFDLENBQUM7NkJBQ047d0JBQ0wsQ0FBQyxDQUFBO3FCQUNKO29CQUNELHNFQUFzRTtvQkFDdEUsOEJBQThCO2dCQUNsQyxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUMsQ0FBQyxDQUFDO1NBQ047YUFBTTtZQUNILE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUMzQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbEI7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQTtBQUdELGlIQUFpSDtBQUNqSCxNQUFNLENBQUMsS0FBSyxVQUFVLGtCQUFrQixDQUFDLFFBQVEsRUFBQyxHQUFHLEdBQUMsTUFBTSxFQUFDLEtBQUssR0FBQyxDQUFDLEVBQUMsR0FBRyxHQUFDLEtBQUs7SUFHMUUsSUFBSSxJQUFJLEdBQUcsTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUM7SUFFeEMsSUFBRyxJQUFJO1FBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7O1FBQzNCLE9BQU8sU0FBUyxDQUFDO0lBRXRCLElBQUksYUFBYSxHQUFHLEVBQUUsQ0FBQztJQUN2QixJQUFJLFdBQVcsR0FBRyxFQUFFLENBQUM7SUFDckIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDO0lBRWpCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNmLElBQUcsQ0FBQyxFQUFFO1lBQ0YsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwQixhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3pCOztZQUNJLGFBQWEsQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxRQUFRLEVBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsSUFBRyxHQUFHLEtBQUssS0FBSztRQUFFLEdBQUcsR0FBRyxJQUFJLENBQUM7U0FDeEIsSUFBRyxHQUFHLEdBQUcsSUFBSSxFQUFFO1FBQ2hCLEtBQUssR0FBRyxJQUFJLEdBQUMsQ0FBQyxHQUFHLEdBQUMsS0FBSyxDQUFDLENBQUM7UUFDekIsR0FBRyxHQUFHLElBQUksQ0FBQztLQUNkO0lBRUQsSUFBSSxJQUFJLEdBQUcsTUFBTSxhQUFhLENBQUMsUUFBUSxFQUFDLEdBQUcsRUFBQyxLQUFLLEVBQUMsR0FBRyxDQUFDLENBQUM7SUFFdkQsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQ2xCLElBQUksT0FBTyxHQUFHLENBQUMsQ0FBQztJQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFDLENBQUMsRUFBRSxFQUFFO1FBQ2pCLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsT0FBTSxPQUFPLEdBQUcsR0FBRyxDQUFDLE1BQU0sR0FBQyxDQUFDLEVBQUU7WUFDMUIsSUFBSSxDQUFDLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pDLElBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDUixPQUFPLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2dCQUNuRCxPQUFPLEVBQUUsQ0FBQzthQUNiO2lCQUNJO2dCQUNELE9BQU8sQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEUsT0FBTyxJQUFFLENBQUMsQ0FBQzthQUNkO1NBQ0o7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sT0FBTyxDQUFDO0FBRW5CLENBQUMifQ==