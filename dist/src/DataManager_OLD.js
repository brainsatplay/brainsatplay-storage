//Load and save CSV data
import { Session } from '../Session.js';
import { StateManager } from '../utils/StateManager.js';
import { CSV } from './general/csv.js';
let fsInited = false;
import * as BrowserFS from 'browserfs';
const fs = BrowserFS.BFSRequire('fs');
const BFSBuffer = BrowserFS.BFSRequire('buffer').Buffer;
// ----------------------------- Generic Functions for BrowserFS -----------------------------
export const initFS = (oninit = () => { }, onerror = () => { }) => {
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
export const readFiles = async (path) => {
    if (!fsInited)
        await initFS();
    return new Promise(resolve => {
        fs.readdir(path, function (e, output) {
            resolve(output);
        });
    });
};
export const readFile = async (path) => {
    if (!fsInited)
        await initFS();
    return new Promise(resolve => {
        fs.readFile(path, function (e, output) {
            resolve(output);
        });
    });
};
export const saveFile = async (content, path) => {
    if (!fsInited)
        await initFS();
    // Assumes content is text
    return new Promise(async (resolve) => {
        await _checkDirectoryExistence(fs, path.split('/')[1]);
        fs.writeFile(path, content, (e) => {
            if (e)
                throw e;
            resolve(content);
        });
    });
};
let directories = {};
export const _checkDirectoryExistence = (fs, directory) => {
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
// ----------------------------- Complete DataManager Class -----------------------------
export class DataManager {
    constructor(session = new Session(), onload = this.onload) {
        this.deinit = () => {
            this.state.unsubscribeAll('loaded');
            if (this.infoSub)
                this.state.unsubscribe('info', this.infoSub);
            this.deviceSubs.forEach((sub) => { this.session.unsubscribeAll(sub); });
        };
        this.onload = (loaded) => {
            //console.log(loaded);
        };
        this.readyFNIRSDataForWriting = (from = 0, to = 'end') => {
            let data = this.session.atlas.readyFNIRSDataForWriting(from, to);
            return data;
        };
        this.readyEEGDataForWriting = (from = 0, to = 'end', getFFTs = true) => {
            let data = this.session.atlas.readyEEGDataForWriting(from, to, getFFTs);
            // console.log(data)
            return data;
        };
        this.saveFNIRSData = (from = 0, to = 'end') => {
            let data = this.session.atlas.readyFNIRSDataForWriting(from, to);
            data = data.join('');
            CSV.saveCSV(data, this.toISOLocal(new Date()) + "_heg");
        };
        this.saveEEGdata = (from = 0, to = 'end', getFFTs = true) => {
            let data = this.session.atlas.readyEEGDataForWriting(from, to, getFFTs);
            data = data.join('');
            CSV.saveCSV(data, this.toISOLocal(new Date()) + "_eeg");
        };
        this.save = (from = 0, to = 'end', getFFTs = true) => {
            let data = this.session.atlas.readyDataForWriting(from, to, getFFTs);
            data = data.join('');
            CSV.saveCSV(data, this.toISOLocal(new Date()));
        };
        this.parseFNIRSData = (data = [], header = []) => {
            let t = [], red = [], ir = [], ratio = [], temp = [], ratiosma = [], ambient = [], bpm = [], hrv = [], brpm = [], brv = [], beatTimes = [], breathTimes = [], notes = [], noteTimes = [], noteIndices = [];
            let err = 0;
            let mse = 0;
            let noteidx = undefined;
            let note = header.find((h, i) => {
                if (h.toLowerCase().indexOf('note') > -1) {
                    noteidx = i;
                    return true;
                }
            });
            data.forEach((r, i) => {
                let row = r.split(',');
                t.push(parseFloat(row[1]));
                red.push(parseFloat(row[2]));
                ir.push(parseFloat(row[3]));
                ratio.push(parseFloat(row[4]));
                temp.push(parseFloat(row[5]));
                if (row[6] && row[6] !== "") {
                    bpm.push(parseFloat(row[6]));
                    hrv.push(parseFloat(row[7]));
                    beatTimes.push(t[t.length - 1]);
                }
                if (row[8] && row[8] !== "") {
                    brpm.push(parseFloat(row[8]));
                    brv.push(parseFloat(row[9]));
                    breathTimes.push(t[t.length - 1]);
                }
                if (ratio.length > 40)
                    ratiosma.push(this.mean(ratio.slice(ratio.length - 40)));
                else
                    ratiosma.push(this.mean(ratio.slice(0)));
                ambient.push(parseFloat(row[5]));
                if (noteidx) {
                    if (row[noteidx]) {
                        notes.push(row[noteidx]);
                        noteTimes.push(t[t.length - 1]);
                        noteIndices.push(i);
                    }
                }
                err += Math.abs((ratio[ratio.length - 1] - ratiosma[ratiosma.length - 1]) / ratiosma[ratiosma.length - 1]);
                mse += Math.pow((ratio[ratio.length - 1] - ratiosma[ratiosma.length - 1]), 2);
            });
            err = err / ratio.length;
            let rmse = Math.sqrt(mse / ratiosma.length);
            this.state.data.type = 'heg';
            this.state.data.loaded.header = header;
            this.state.data.loaded.data = {
                times: t, red: red, ir: ir, ratio: ratio, ratiosma: ratiosma, ambient: ambient, temp: temp, error: err, rmse: rmse, notes: notes, noteTimes: noteTimes, noteIndices: noteIndices,
                bpm: bpm, hrv: hrv, brpm: brpm, brv: brv, beatTimes: beatTimes, breathTimes: breathTimes
            };
        };
        //for getting data saved in our format
        this.getFNIRSDataFromCSV = () => {
            CSV.openCSV(',', (data, header) => {
                this.parseFNIRSData(data, header);
            });
        };
        this.parseEEGData = (data, header) => {
            let channels = { times: [], fftTimes: [], fftFreqs: [], notes: [], noteTimes: [], noteIndices: [] };
            let indices = [];
            let dtypes = [];
            let names = [];
            let ffts = false;
            header.forEach((value, idx) => {
                let v = value.split(';');
                if (v.length > 1) {
                    if (v[1].toLowerCase().indexOf("fft") > -1) {
                        if (ffts === true & channels.fftFreqs.length === 0) {
                            channels.fftFreqs = header.slice(indices[indices.length - 1] + 1, idx).map(x => x = parseFloat(x));
                        }
                        ffts = true;
                        indices.push(idx);
                        dtypes.push('fft');
                        channels[v[0] + "_fft"] = [];
                        names.push(v[0] + "_fft");
                    }
                }
                else if (ffts === false && idx > 2) {
                    indices.push(idx); //push all headers till we get to the first fft header
                    channels[v[0] + "_signal"] = [];
                    names.push(v[0] + "_signal");
                    dtypes.push('signal');
                }
                else if (v[0].toLowerCase().indexOf('unix') > -1) {
                    dtypes.push('times');
                    names.push('times');
                    indices.push(idx);
                }
                else if (v[0].toLowerCase().indexOf('note') > -1) {
                    dtypes.push('notes');
                    names.push('notes');
                    indices.push(idx);
                    //console.log(idx)
                }
            });
            data.forEach((r, i) => {
                let row = r.split(',');
                let j = 0;
                let ffttime = false;
                indices.forEach((idx, j) => {
                    if (dtypes[j] === 'signal') {
                        channels[names[j]].push(parseFloat(row[idx]));
                    }
                    else if (dtypes[j] === 'fft' && row[idx + 1]) {
                        if (!ffttime) {
                            channels.fftTimes.push(parseFloat(row[1]));
                            ffttime = true;
                        }
                        if (indices[j + 1]) {
                            channels[names[j]].push([...row.slice(idx + 1, indices[j + 1])].map(x => parseFloat(x)));
                        }
                        else
                            channels[names[j]].push([...row.slice(idx + 1)].map(x => parseFloat(x)));
                    }
                    else if (dtypes[j] === 'times') {
                        channels.times.push(parseFloat(row[1]));
                    }
                    else if (dtypes[j] === 'notes' && row[idx]) {
                        channels.notes.push(row[idx]);
                        channels.noteTimes.push(parseFloat(row[1]));
                        channels.noteIndices.push(i);
                    }
                });
            });
            this.state.data.loaded = { type: 'eeg', header: header, data: channels };
        };
        this.getEEGDataFromCSV = () => {
            CSV.openCSV(',', (data, header) => {
                this.parseEEGData(data, header);
            });
        };
        //----------------------
        //------BrowserFS-------
        //----------------------
        this.initFS = initFS;
        this._checkDirectoryExistence = _checkDirectoryExistence;
        this.setupAutosaving = () => {
            //configure autosaving when the device is connected
            this.session.state.data.info = this.session.info;
            //console.log(this.session.state.data.info);
            this.infoSub = this.session.state.subscribe('info', (info) => {
                if (info.nDevices > 0) {
                    let thisDevice = this.session.deviceStreams[this.session.info.nDevices - 1];
                    let deviceIdx = this.session.info.nDevices - 1;
                    let randomId = thisDevice.info.randomId;
                    let mainDeviceType = thisDevice.info.deviceType;
                    let exists = false;
                    if (mainDeviceType === 'eeg') {
                        if (this.deviceSubs.indexOf(mainDeviceType + "_" + thisDevice.device.atlas.data.eegshared.eegChannelTags[0].ch) > -1) {
                            exists = true;
                        }
                    }
                    else if (mainDeviceType === 'heg') {
                        let hegindex = thisDevice.device.atlas.data.heg.length - 1;
                        if (this.deviceSubs.indexOf(mainDeviceType + "_" + hegindex) > -1) {
                            exists = true;
                        }
                    }
                    if (!exists) {
                        let newsession = () => {
                            if (!this.session.deviceStreams.find((o) => {
                                if (o.randomId === randomId)
                                    ;
                                return true;
                            })) {
                                if (this.saveBCISession)
                                    this.saveBCISession.removeEventListener('click', newsession);
                                return false;
                            }
                            this.newSession(undefined, thisDevice, deviceIdx);
                        };
                        if (mainDeviceType === 'eeg') {
                            let deviceName = thisDevice.info.deviceName;
                            this.state.data['sessionName' + deviceName + deviceIdx] = '';
                            this.state.data['saveCounter' + deviceName + deviceIdx] = 0;
                            this.state.data['sessionChunks' + deviceName + deviceIdx] = 0;
                            if (this.state.data['sessionName' + deviceName + deviceIdx] === '') {
                                this.state.data['sessionName' + deviceName + deviceIdx] = this.toISOLocal(new Date()) + "eeg_" + deviceName + deviceIdx;
                                // fs.appendFile('/data/' + this.state.data['sessionName'+deviceName+deviceIdx], '', (e) => {
                                //     if (e) throw e;
                                //     this.listFiles();
                                // }); //+"_c"+State.data.sessionChunks
                            }
                            console.log(deviceName);
                            this.session.subscribe(deviceIdx, thisDevice.device.atlas.data.eegshared.eegChannelTags[0].ch, undefined, async (row) => {
                                let toAutosave = await this.session.storage.get('settings', 'Autosave Data');
                                if (toAutosave) {
                                    if (this.state.data['saveCounter' + deviceName + deviceIdx] > row.count) {
                                        this.state.data['saveCounter' + deviceName + deviceIdx] = thisDevice.device.atlas.rolloverLimit - this.state.data.saveChunkSize;
                                    } //rollover occurred, adjust
                                    if (row.count - this.state.data['saveCounter' + deviceName + deviceIdx] >= this.state.data.saveChunkSize) {
                                        this.autoSaveEEGChunk(this.state.data['saveCounter' + deviceName + deviceIdx], undefined, deviceName + deviceIdx, undefined, undefined, thisDevice.device.atlas);
                                        this.state.data['saveCounter' + deviceName + deviceIdx] = row.count;
                                    }
                                }
                            });
                            this.deviceSubs.push(mainDeviceType + "_" + thisDevice.device.atlas.data.eegshared.eegChannelTags[0].ch);
                            let save = () => {
                                if (!this.session.deviceStreams.find((o) => {
                                    if (o.randomId === randomId)
                                        ;
                                    return true;
                                })) {
                                    if (this.saveBCISession)
                                        this.saveBCISession.removeEventListener('click', save);
                                    return false;
                                }
                                //console.log(this.session.deviceStreams)
                                let row = thisDevice.device.atlas.getEEGDataByChannel(thisDevice.device.atlas.data.eegshared.eegChannelTags[0].ch);
                                if (this.state.data['saveCounter' + deviceName + deviceIdx] > row.count) {
                                    this.state.data['saveCounter' + deviceName + deviceIdx] = thisDevice.device.atlas.rolloverLimit - 2000;
                                } //rollover occurred, adjust
                                this.autoSaveEEGChunk(this.state.data['saveCounter' + deviceName + deviceIdx], undefined, deviceName + deviceIdx, undefined, undefined, thisDevice.device.atlas);
                                this.state.data['saveCounter' + deviceName + deviceIdx] = row.count;
                            };
                            if (this.saveBCISession)
                                this.saveBCISession.addEventListener('click', save);
                            if (this.newBCISession)
                                this.newBCISession.addEventListener('click', newsession);
                        }
                        else if (mainDeviceType === 'heg') {
                            let hegindex = thisDevice.device.atlas.data.heg.length - 1;
                            let deviceName = thisDevice.info.deviceName;
                            this.state.data['sessionName' + deviceName + deviceIdx] = "";
                            this.state.data['saveCounter' + deviceName + deviceIdx] = 0;
                            this.state.data['sessionChunks' + deviceName + deviceIdx] = 0;
                            if (this.state.data['sessionName' + deviceName + deviceIdx] === '') {
                                this.state.data['sessionName' + deviceName + deviceIdx] = this.toISOLocal(new Date()) + "heg_" + deviceName + deviceIdx;
                                // fs.appendFile('/data/' + this.state.data['sessionName'+deviceName+deviceIdx], '', (e) => {
                                //     if (e) throw e;
                                //     this.listFiles();
                                // }); //+"_c"+State.data.sessionChunks
                            }
                            this.session.subscribe(deviceIdx, hegindex, undefined, (row) => {
                                if (this.state.data.autosaving) {
                                    //if(this.state.data.saveCounter > row.count) { this.state.data.saveCounter = this.session.atlas.rolloverLimit - 2000; } //rollover occurred, adjust
                                    if (thisDevice.device.atlas.data.heg[hegindex].count - this.state.data['saveCounter' + deviceName + deviceIdx] >= this.state.data.saveChunkSize) {
                                        this.autoSaveFNIRSChunk(this.state.data['saveCounter' + deviceName + deviceIdx], undefined, deviceName + deviceIdx, undefined, thisDevice.device.atlas);
                                        this.state.data['saveCounter' + deviceName + deviceIdx] = thisDevice.device.atlas.data.heg[hegindex].count;
                                    }
                                }
                            });
                            this.deviceSubs.push(mainDeviceType + "_" + hegindex);
                            let save = () => {
                                if (!this.session.deviceStreams.find((o) => {
                                    if (o.randomId === randomId)
                                        ;
                                    return true;
                                })) {
                                    if (this.saveBCISession)
                                        this.saveBCISession.removeEventListener('click', save);
                                    return false;
                                }
                                this.autoSaveFNIRSChunk(this.state.data['saveCounter' + deviceName + deviceIdx], undefined, deviceName + deviceIdx, undefined, thisDevice.device.atlas);
                                this.state.data['saveCounter' + deviceName + deviceIdx] = thisDevice.device.atlas.data.heg[hegindex].count;
                            };
                            if (this.saveBCISession)
                                this.saveBCISession.addEventListener('click', save);
                            if (this.newBCISession)
                                this.newBCISession.addEventListener('click', newsession);
                        }
                    }
                }
            });
        };
        this.newSession = (oncreated = this.listFiles, deviceStream, deviceIdx) => {
            let deviceType = deviceStream.info.deviceType;
            let sessionName = new Date().toISOString(); //Use the time stamp as the session name
            if (deviceType === 'eeg') {
                sessionName += "_eeg";
            }
            else if (deviceType === 'heg') {
                sessionName += "_heg";
            }
            sessionName += "_" + deviceStream.info.deviceName + deviceIdx;
            this.state.data['sessionName' + deviceStream.info.deviceName + deviceIdx] = sessionName;
            this.state.data['sessionChunks' + deviceStream.info.deviceName + deviceIdx] = 0;
            this.state.data.newSessionCt++;
            fs.appendFile('/data/' + sessionName, "", (e) => {
                if (e)
                    throw e;
                oncreated();
            });
        };
        this.autoSaveEEGChunk = (startidx = 0, to = 'end', deviceName = 'eeg', getFFTs = true, onsaved = this.listFiles, deviceAtlas) => {
            if (this.state.data['sessionName' + deviceName] === '') {
                this.state.data['sessionName' + deviceName] = this.toISOLocal(new Date()) + "eeg_" + deviceName;
            }
            let from = startidx;
            if (this.state.data['sessionChunks' + deviceName] > 0) {
                from = this.state.data['saveCounter' + deviceName];
            }
            let data = deviceAtlas.readyEEGDataForWriting(from, to, getFFTs);
            console.log("Saving chunk to /data/" + this.state.data['sessionName' + deviceName], this.state.data['sessionChunks' + deviceName]);
            if (this.state.data['sessionChunks' + deviceName] === 0) {
                fs.appendFile('/data/' + this.state.data['sessionName' + deviceName], data[0] + data[1], (e) => {
                    if (e)
                        throw e;
                    this.state.data['sessionChunks' + deviceName]++;
                    onsaved();
                }); //+"_c"+State.data['sessionChunks'+deviceName]
            }
            else {
                fs.appendFile('/data/' + this.state.data['sessionName' + deviceName], "\n" + data[1], (e) => {
                    if (e)
                        throw e;
                    this.state.data['sessionChunks' + deviceName]++;
                    onsaved();
                }); //+"_c"+State.data['sessionChunks'+deviceName]
            }
        };
        this.autoSaveFNIRSChunk = (startidx = 0, to = 'end', deviceName = "heg", onsaved = this.listFiles, deviceAtlas) => {
            if (this.state.data['sessionName' + deviceName] === '') {
                this.state.data['sessionName' + deviceName] = this.toISOLocal(new Date()) + "heg_" + deviceName;
            }
            let from = startidx;
            if (this.state.data['sessionChunks' + deviceName] > 0) {
                from = this.state.data['saveCounter' + deviceName];
            }
            let data = deviceAtlas.readyFNIRSDataForWriting(from, to);
            console.log("Saving chunk to /data/" + this.state.data['sessionName' + deviceName], this.state.data['sessionChunks' + deviceName]);
            if (this.state.data['sessionChunks' + deviceName] === 0) {
                fs.appendFile('/data/' + this.state.data['sessionName' + deviceName], data[0] + data[1], (e) => {
                    if (e)
                        throw e;
                    this.state.data['sessionChunks' + deviceName]++;
                    onsaved();
                }); //+"_c"+State.data['sessionChunks'+deviceName]
            }
            else {
                fs.appendFile('/data/' + this.state.data['sessionName' + deviceName], "\n" + data[1], (e) => {
                    if (e)
                        throw e;
                    this.state.data['sessionChunks' + deviceName]++;
                    onsaved();
                }); //+"_c"+State.data['sessionChunks'+deviceName]
            }
        };
        this.getFilenames = (onload = (directory) => { }, directory = '/data') => {
            fs.readdir(directory, (e, dir) => {
                if (e)
                    throw e;
                if (dir) {
                    console.log("files", dir);
                    onload(dir);
                }
            });
        };
        this.getFileSize = (filename, onread = (size) => { console.log(size); }) => {
            fs.stat('/data/' + filename, (e, stats) => {
                if (e)
                    throw e;
                let filesize = stats.size;
                onread(filesize);
            });
        };
        this.deleteFile = (path = "/data/" + this.state.data['sessionName'], ondelete = this.listFiles) => {
            if (path != '') {
                fs.unlink(path, (e) => {
                    if (e)
                        console.error(e);
                    ondelete();
                });
            }
            else {
                console.error('Path name is not defined');
            }
        };
        // Assumes content is text
        this.saveFile = saveFile;
        this.readFiles = readFiles; // exported
        this.readFile = readFile; // exported
        //Read a chunk of data from a saved dataset
        this.readFromDB = (filename = this.state.data['sessionName'], begin = 0, end = 5120, onread = (data) => { }) => {
            if (filename != '') {
                fs.open('/data/' + filename, 'r', (e, fd) => {
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
                            });
                        }
                        ;
                    });
                });
            }
            else {
                console.error('Path name is not defined');
            }
        };
        this.loadCSVintoDB = (onload = (data) => { }) => {
            CSV.openCSVRaw((data, path) => {
                let split = path.split(`\\`);
                let filename = split[split.length - 1].slice(0, split[split.length - 1].length - 4);
                console.log(filename);
                fs.appendFile('/data/' + filename, data, (e) => {
                    if (e)
                        throw e;
                    onload(data);
                });
            });
        };
        this.parseDBData = (data, head, filename, hasend = true) => {
            let lines = data.split('\n');
            lines.shift();
            if (hasend === false)
                lines.pop(); //pop first and last rows if they are likely incomplete
            if (filename.indexOf('heg') > -1) {
                this.parseFNIRSData(lines, head);
                //this.session.dataManager.loaded
            }
            else { //eeg data
                this.parseEEGData(lines, head);
            }
            return this.state.data.loaded;
        };
        this.getCSVHeader = (filename = '', onOpen = (header, filename) => { console.log(header, filename); }) => {
            fs.open('/data/' + filename, 'r', (e, fd) => {
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
                            onOpen(header, filename);
                        });
                    }
                    ;
                });
            });
        };
        //
        this.listFiles = (onload = (directory) => { }, fs_html_id = "filesystem") => {
            fs.readdir('/data', (e, directory) => {
                if (e)
                    throw e;
                if (directory) {
                    console.log("files", directory);
                    onload(directory);
                    if (fs_html_id) {
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
                                    this.writeToCSV(str);
                                };
                                document.getElementById(str + "delete").onclick = () => {
                                    this.deleteFile("/data/" + str);
                                };
                            }
                        });
                    }
                }
            });
        };
        //Write CSV data in chunks to not overwhelm memory
        this.writeToCSV = async (filename = this.state.data['sessionName']) => {
            if (filename != '') {
                fs.stat('/data/' + filename, (e, stats) => {
                    if (e)
                        throw e;
                    let filesize = stats.size;
                    console.log(filesize);
                    fs.open('/data/' + filename, 'r', (e, fd) => {
                        if (e)
                            throw e;
                        let i = 0;
                        let maxFileSize = this.state.data.fileSizeLimitMb * 1024 * 1024;
                        let end = maxFileSize;
                        if (filesize < maxFileSize) {
                            end = filesize;
                            fs.read(fd, end, 0, 'utf-8', (e, output, bytesRead) => {
                                if (e)
                                    throw e;
                                if (bytesRead !== 0)
                                    CSV.saveCSV(output.toString(), filename);
                                fs.close(fd);
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
            }
        };
        //backup file to drive by name (requires gapi authorization)
        this.backupToDrive = (filename) => {
            if (window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
                fs.readFile('/data/' + filename, (e, output) => {
                    if (e)
                        throw e;
                    let file = new Blob([output.toString()], { type: 'text/csv' });
                    this.checkFolder((result) => {
                        let metadata = {
                            'name': filename + ".csv",
                            'mimeType': 'application/vnd.google-apps.spreadsheet',
                            'parents': [result.files[0].id]
                        };
                        let token = gapi.auth.getToken().access_token;
                        var form = new FormData();
                        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                        form.append('file', file);
                        var xhr = new XMLHttpRequest();
                        xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
                        xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                        xhr.responseType = 'json';
                        xhr.onload = () => {
                            console.log("Uploaded file id: ", xhr.response.id); // Retrieve uploaded file ID.
                            this.listDriveFiles();
                        };
                        xhr.send(form);
                    });
                });
            }
            else {
                alert("Sign in with Google first!");
            }
        };
        this.session = session;
        this.state = new StateManager({
            // autosaving: true,
            saveChunkSize: 2000,
            newSessionCt: 0,
            fileSizeLimitMb: 250,
            loaded: { header: [], data: {}, type: '' }
        });
        this.onload = onload;
        this.fs = fs;
        this.sub = this.state.subscribe('loaded', (loaded) => { this.onload(loaded); });
        this.infoSub = null;
        this.deviceSubs = [];
        this.saveBCISession = document.getElementById("saveBCISession");
        this.newBCISession = document.getElementById("newBCISession");
    }
    mean(arr) {
        var sum = arr.reduce((prev, curr) => curr += prev);
        return sum / arr.length;
    }
    toISOLocal(d) {
        var z = n => ('0' + n).slice(-2);
        var zz = n => ('00' + n).slice(-3);
        var off = d.getTimezoneOffset();
        var sign = off < 0 ? '+' : '-';
        off = Math.abs(off);
        return d.getFullYear() + '-' //https://stackoverflow.com/questions/49330139/date-toisostring-but-local-time-instead-of-utc
            + z(d.getMonth() + 1) + '-' +
            z(d.getDate()) + 'T' +
            z(d.getHours()) + ':' +
            z(d.getMinutes()) + ':' +
            z(d.getSeconds()) + '.' +
            zz(d.getMilliseconds()) +
            "(UTC" + sign + z(off / 60 | 0) + ':00)';
    }
    readFileText(path, onread = (data, filename) => { console.log(filename, data); }) {
        fs.open(path, 'r', (e, fd) => {
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
                    });
                }
                ;
            });
        });
    }
    //------------------------
    //-GOOGLE DRIVE FUNCTIONS-
    //------------------------
    checkFolder(onResponse = (result) => { }) {
        window.gapi.client.drive.files.list({
            q: "name='Brainsatplay_Data' and mimeType='application/vnd.google-apps.folder'",
        }).then((response) => {
            if (response.result.files.length === 0) {
                this.createDriveFolder();
                if (onResponse)
                    onResponse(response.result);
            }
            else if (onResponse)
                onResponse(response.result);
        });
    }
    createDriveFolder(name = 'Brainsatplay_Data') {
        let data = new Object();
        data.name = name;
        data.mimeType = "application/vnd.google-apps.folder";
        gapi.client.drive.files.create({ 'resource': data }).then((response) => {
            console.log(response.result);
        });
    }
    //doSomething(){}
    listDriveFiles(listDivId, onload = this.listFiles, ondownload = (csvdata) => { }) {
        this.checkFolder((result) => {
            window.gapi.client.drive.files.list({
                q: `'${result.files[0].id}' in parents`,
                'pageSize': 10,
                'fields': "nextPageToken, files(id, name)"
            }).then((response) => {
                document.getElementById(this.props.id + 'drivefiles').innerHTML = ``;
                //this.appendContent('Drive Files (Brainsatplay_Data folder):','drivefiles');
                var files = response.result.files;
                if (files && files.length > 0) {
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        document.getElementById(listDivId).insertAdjacentHTML('beforeend', `<div id=${file.id} style='border: 1px solid white;'>${file.name}<button id='${file.id}dload'>Download</button></div>`);
                        document.getElementById(file.id + 'dload').onclick = () => {
                            //Get CSV data from drive
                            var request = gapi.client.drive.files.export({ 'fileId': file.id, 'mimeType': 'text/csv' });
                            request.then((resp) => {
                                let filename = file.name;
                                fs.appendFile('/data/' + filename, resp.body, (e) => {
                                    if (e)
                                        throw e;
                                    ondownload(resp.body);
                                });
                            });
                        };
                    }
                    onload();
                }
                else {
                    return undefined; //this.appendContent('<p>No files found.</p>','drivefiles');
                }
            });
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRGF0YU1hbmFnZXJfT0xELmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL0RhdGFNYW5hZ2VyX09MRC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSx3QkFBd0I7QUFDeEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN4QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDeEQsT0FBTyxFQUFDLEdBQUcsRUFBQyxNQUFNLGtCQUFrQixDQUFBO0FBRXBDLElBQUksUUFBUSxHQUFHLEtBQUssQ0FBQTtBQUNwQixPQUFPLEtBQUssU0FBUyxNQUFNLFdBQVcsQ0FBQTtBQUN0QyxNQUFNLEVBQUUsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3RDLE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDO0FBR3hELDhGQUE4RjtBQUM5RixNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsQ0FBQyxNQUFNLEdBQUMsR0FBRSxFQUFFLEdBQUMsQ0FBQyxFQUFFLE9BQU8sR0FBQyxHQUFFLEVBQUUsR0FBQyxDQUFDLEVBQUUsRUFBRTtJQUNwRCxJQUFJLFFBQVE7UUFBRSxPQUFPLElBQUksQ0FBQTtTQUNwQjtRQUNMLE9BQU8sSUFBSSxPQUFPLENBQUUsT0FBTyxDQUFDLEVBQUU7WUFDMUIsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUU7Z0JBQ3hELElBQUksQ0FBQztvQkFBRSxNQUFNLENBQUMsQ0FBQztnQkFDZixJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNiLE9BQU8sRUFBRSxDQUFDO29CQUNWLE1BQU0sSUFBSSxLQUFLLENBQUMs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