// From https://stackoverflow.com/questions/23150333/html5-javascript-dataurl-to-blob-blob-to-dataurl
//**dataURL to blob**
export function dataURLtoBlob(dataurl) {
    if (isDataURL(dataurl)) {
        var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1], bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
}
//**blob to dataURL**
export function blobToDataURL(blob, callback) {
    var a = new FileReader();
    a.onload = function (e) { callback(e.target.result); };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmxvYlV0aWxzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL2Jsb2JVdGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxxR0FBcUc7QUFFckcscUJBQXFCO0FBQ3JCLE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBTztJQUNqQyxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBQztRQUNuQixJQUFJLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUMzRCxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxJQUFJLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwRSxPQUFNLENBQUMsRUFBRSxFQUFDO1lBQ04sS0FBSyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDakM7UUFDRCxPQUFPLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsRUFBQyxJQUFJLEVBQUMsSUFBSSxFQUFDLENBQUMsQ0FBQztLQUN6QztBQUNMLENBQUM7QUFFRCxxQkFBcUI7QUFDckIsTUFBTSxVQUFVLGFBQWEsQ0FBQyxJQUFJLEVBQUUsUUFBUTtJQUN4QyxJQUFJLENBQUMsR0FBRyxJQUFJLFVBQVUsRUFBRSxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxNQUFNLEdBQUcsVUFBUyxDQUFDLElBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRUQsd0NBQXdDO0FBQ3hDLDhDQUE4QztBQUM5QyxzQkFBc0I7QUFDdEIsb0VBQW9FO0FBQ3BFLDREQUE0RDtBQUM1RCxvRUFBb0U7QUFFcEUsU0FBUyxTQUFTLENBQUMsQ0FBQztJQUNoQixPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBQ0QsU0FBUyxDQUFDLEtBQUssR0FBRyx1SEFBdUgsQ0FBQyJ9