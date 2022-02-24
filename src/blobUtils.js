// From https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl

//**dataURL to blob**
export function dataURLtoBlob(dataurl) {
    if (isDataURL(dataurl)){
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }
}

//**blob to dataURL**
export function blobToDataURL(blob, callback) {
    var a = new FileReader();
    a.onload = function(e) {callback(e.target.result);}
    a.readAsDataURL(blob);
}

// DETERMINE WHETHER INPUT IS A DATA URL
// From https://gist.github.com/bgrins/6194623
// Detecting data URLs
// data URI - MDN https://developer.mozilla.org/en-US/docs/data_URIs
// The "data" URL scheme: http://tools.ietf.org/html/rfc2397
// Valid URL Characters: http://tools.ietf.org/html/rfc2396#section2

function isDataURL(s) {
    return !!s.match(isDataURL.regex);
}
isDataURL.regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;


//can write data to blobs and automatically chunk the file buffers into storage objects
export async function dataToBlob(
    data, 
    filetype='text/plain', 
    chunkSize=256000 //if file bigger than chunk size, split it up automatically into smaller blobs with metadata
) {
    let file = {filename, data: new Blob([data],{filetype:filetype})};
    Object.assign(file,props);

    if(file.data.size > chunkSize) {
        const size = file.data.size;
        let written = 0;
        let i = 0;
        let chunks = [];
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
                chunks.push(chunk);
            }

            written += chunkSize;
            i++;
        }
        return chunks;
    } else return file;

}