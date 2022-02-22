//By Joshua Brewster (MIT License)
export class CSV {
    constructor(onOpen = this.onOpen, saveButtonId = null, openButtonId = null) {
        this.onOpen = onOpen;
        this.notes = [{ idx: 0, text: "comment" }]; //order comments by data index
        if (saveButtonId !== null) {
            document.getElementById(saveButtonId).addEventListener('click', this.saveCSV);
        }
        if (openButtonId !== null) {
            document.getElementById(openButtonId).addEventListener('click', this.openCSV);
        }
    }
    processArraysForCSV(data = ["1|2|3", "3|2|1"], delimiter = "|", header = "a,b,c", saveNotes = false) {
        let csvDat = header + "\n";
        let noteIdx = 0;
        data.forEach((line, i) => {
            if (data[i] === "string" && delimiter !== ",") {
                csvDat += line.split(delimiter).join(",");
            }
            else {
                csvData += line.join(",");
            } // Data can just be an array of arrays
            if (saveNotes === true) {
                if (this.notes[noteIdx].idx === i) {
                    line += this.notes[noteIdx].text;
                    noteIdx++;
                }
            }
            if (line.indexOf('\n') < 0) {
                csvDat += "\n";
            } //Add line endings exist in unprocessed array data
        });
        return csvDat;
    }
    //Converts an array of strings (e.g. raw data stream text) or an array of arrays representing lines of data into CSVs
    static saveCSV(csvDat = "a,b,c\n1,2,3\n3,2,1\n", name = new Date().toISOString()) {
        var hiddenElement = document.createElement('a');
        hiddenElement.href = "data:text/csv;charset=utf-8," + encodeURI(csvDat);
        hiddenElement.target = "_blank";
        if (name !== "") {
            hiddenElement.download = name + ".csv";
        }
        else {
            hiddenElement.download = Date().toISOString() + ".csv";
        }
        hiddenElement.click();
    }
    static openCSV(delimiter = ",", onOpen = (csvDat, header, path) => { return csvDat, header, path; }) {
        var input = document.createElement('input');
        input.accept = '.csv';
        input.type = 'file';
        input.onchange = (e) => {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.onload = (event) => {
                var tempcsvData = event.target.result;
                var tempcsvArr = tempcsvData.split("\n");
                let header = [];
                var csvDat = [];
                tempcsvArr.pop();
                tempcsvArr.forEach((row, i) => {
                    if (i == 0) {
                        header = row.split(delimiter);
                    }
                    else {
                        var temp = row.split(delimiter);
                        csvDat.push(temp);
                    }
                });
                onOpen(csvDat, header, input.value);
                input.value = '';
            };
            reader.readAsText(file);
        };
        input.click();
    }
    //Dump CSV data without parsing it.
    static openCSVRaw(onOpen = (csvDat, path) => { return csvDat, path; }) {
        var input = document.createElement('input');
        input.accept = '.csv';
        input.type = 'file';
        input.onchange = (e) => {
            var file = e.target.files[0];
            var reader = new FileReader();
            reader.onload = (event) => {
                var tempcsvData = event.target.result;
                onOpen(tempcsvData, input.value);
                input.value = '';
            };
            reader.readAsText(file);
        };
        input.click();
    }
    onOpen(csvDat = [], header = []) {
        console.log("CSV Opened!", header, csvDat);
    }
}
//e.g. let csv = CSV.openCSV(',',(data,head,path) => {
//   let name = path.split('/').pop();
//   result = parseCSVData(data,head,name);
//   console.log(result);
//})
export const parseCSVData = (data, head, filename, hasend = true, parser = (lines, head, filename) => {
    let result = { filename: filename, head: head };
    let headers = head;
    if (typeof head === 'string')
        headers = head.split(',');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].split(',');
        for (let j = 0; j < line.length; j++) {
            if (!result[headers[j]])
                result[headers[j]];
            result[headers[j]] = line[j];
        }
    }
    return result;
}) => {
    let lines = data.split('\n');
    lines.shift();
    if (hasend === false)
        lines.pop(); //pop last row if they are likely incomplete
    let result = parser(lines, head, filename);
    return result;
};
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
export const processDataForCSV = (options = {}) => {
    let header = '';
    if (typeof options.data[0] === 'object' && !Array.isArray(options.data[0])) {
        if (options.data[0].x)
            header = 'x,';
        else if (options.data[0].timestamp)
            header = 'timestamp,localtime,';
    }
    let headeridx = 0;
    let lines = {}; //associative array (e.g. timestamp = row)
    options.data.forEach((obj, i) => {
        if (Array.isArray(obj)) { //unstructured data just gets pushed into a column
            for (let j = 0; j < obj.length; j++) {
                if (!lines[j])
                    lines[j] = '';
                if (Array.isArray(obj[j])) {
                    if (j === 0)
                        header[headeridx] += options.header[headeridx] + new Array(obj[j].length - 1).fill('').join(','); //add empty spaces
                    lines[j] += obj[j].join(',') + ',';
                    headeridx += obj[j].length;
                }
                else {
                    if (j === 0)
                        header[headeridx] += options.header[headeridx] + ',';
                    lines[j] += obj[j] + ',';
                    headeridx++;
                }
            }
        }
        else if (typeof obj === 'object') {
            let x;
            if (obj.x) {
                x = obj.x;
            }
            else if (obj.timestamp) {
                x = obj.timestamp;
            }
            for (let j = 0; j < x.length; j++) {
                if (!lines[x[j]])
                    lines[x[j]] = x[j] + ',';
                if (obj.timestamp) {
                    lines[x[j]] += toISOLocal(obj.timestamp[j]) + ','; //add local timezone data
                }
                for (const prop in obj) {
                    if (prop !== 'x') {
                        if (!lines[x[j]])
                            lines[x[j]] = '';
                        if (Array.isArray(obj[prop][j])) {
                            if (j === 0)
                                header[headeridx] += options.header[headeridx] + Array(obj[prop][j].length - 1).fill('').join(','); //add empty spaces
                            lines[x[j]] += obj[prop][j].join(',') + ',';
                            headeridx += obj[prop][j].length;
                        }
                        else {
                            if (j === 0)
                                header[headeridx] += options.header[headeridx] + ',';
                            lines[x[j]] += obj[prop][j] + ',';
                            headeridx++;
                        }
                    }
                }
            }
        }
    });
    header.splice(header.length - 1, 1); //remove last comma
    header += '\n';
    let joined = '';
    for (const prop in lines) {
        lines[prop].splice(lines[prop].length - 1, 1); //splice off the trailing comma
        joined += lines[prop] + '\n'; //add a newline
    }
    let result = { filename: options.filename, header: header, body: joined };
    if (options.save) {
        CSV.saveCSV(header + joined, options.filename);
    }
    if (options.write) {
        fs.exists(options.filename, (exists) => {
            if (exists)
                appendFile(options.filename, joined, options.dir);
            else
                appendFile(options.filename, header + joined, options.dir);
        });
    }
    return result;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3N2LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Nzdi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxrQ0FBa0M7QUFDbEMsTUFBTSxPQUFPLEdBQUc7SUFDWixZQUFZLE1BQU0sR0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFlBQVksR0FBQyxJQUFJLEVBQUUsWUFBWSxHQUFDLElBQUk7UUFFaEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLEVBQUMsR0FBRyxFQUFDLENBQUMsRUFBQyxJQUFJLEVBQUMsU0FBUyxFQUFDLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtRQUVyRSxJQUFHLFlBQVksS0FBSyxJQUFJLEVBQUU7WUFDdEIsUUFBUSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1NBQ2pGO1FBQ0QsSUFBRyxZQUFZLEtBQUssSUFBSSxFQUFFO1lBQ3RCLFFBQVEsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztTQUNqRjtJQUNMLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxJQUFJLEdBQUMsQ0FBQyxPQUFPLEVBQUMsT0FBTyxDQUFDLEVBQUcsU0FBUyxHQUFDLEdBQUcsRUFBRSxNQUFNLEdBQUMsT0FBTyxFQUFDLFNBQVMsR0FBQyxLQUFLO1FBQ3RGLElBQUksTUFBTSxHQUFHLE1BQU0sR0FBQyxJQUFJLENBQUM7UUFDekIsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDckIsSUFBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssUUFBUSxJQUFJLFNBQVMsS0FBSyxHQUFH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