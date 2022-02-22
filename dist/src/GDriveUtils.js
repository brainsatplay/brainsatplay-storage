//Requires Google Drive API to be loaded in window with the correct developer API permissions enabled via a Google account
//For gapi including and usage: https://developers.google.com/drive/api/v3/quickstart/js
import { fs } from './BFSUtils.js';
//------------------------
//-GOOGLE DRIVE FUNCTIONS-
//------------------------
export function checkFolder(onResponse = (result) => { }) {
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
export function createDriveFolder(name = 'Brainsatplay_Data') {
    let data = new Object();
    data.name = name;
    data.mimeType = "application/vnd.google-apps.folder";
    window.gapi.client.drive.files.create({ 'resource': data }).then((response) => {
        console.log(response.result);
    });
}
//backup file to drive by name (requires gapi authorization)
export const backupToDrive = (filename, directory = '/data') => {
    if (window.gapi.auth2.getAuthInstance().isSignedIn.get()) {
        fs.readFile(directory + '/' + filename, (e, output) => {
            if (e)
                throw e;
            let file = new Blob([output.toString()], { type: 'text/csv' });
            checkFolder((result) => {
                let metadata = {
                    'name': filename + ".csv",
                    'mimeType': 'application/vnd.google-apps.spreadsheet',
                    'parents': [result.files[0].id]
                };
                let token = window.gapi.auth.getToken().access_token;
                var form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
                form.append('file', file);
                var xhr = new XMLHttpRequest();
                xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.responseType = 'json';
                xhr.onload = () => {
                    console.log("Uploaded file id: ", xhr.response.id); // Retrieve uploaded file ID.
                    listDriveFiles();
                };
                xhr.send(form);
            });
        });
    }
    else {
        alert("Sign in with Google first!");
    }
};
//doSomething(){}
export function listDriveFiles(onload = (files) => { }) {
    checkFolder((result) => {
        window.gapi.client.drive.files.list({
            q: `'${result.files[0].id}' in parents`,
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)"
        }).then((response) => {
            var files = response.result.files;
            if (files && files.length > 0) {
                onload(files);
            }
            else {
                return undefined;
            }
        });
    });
}
function onloadExample(files, backupdir = '/data', ondownload = (filedata) => { }) {
    document.getElementById('drivefiles').innerHTML = ``;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        document.getElementById(listDivId).insertAdjacentHTML('beforeend', `<div id=${file.id} style='border: 1px solid white;'>${file.name}<button id='${file.id}dload'>Download</button></div>`);
        document.getElementById(file.id + 'dload').onclick = () => {
            //Get CSV data from drive
            var request = window.gapi.client.drive.files.export({ 'fileId': file.id, 'mimeType': 'text/csv' });
            request.then((resp) => {
                let filename = file.name;
                fs.appendFile(backupdir + '/' + filename, resp.body, (e) => {
                    if (e)
                        throw e;
                    ondownload(resp.body);
                });
            });
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiR0RyaXZlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvR0RyaXZlVXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEhBQTBIO0FBQzFILHdGQUF3RjtBQUd4RixPQUFPLEVBQUMsRUFBRSxFQUFDLE1BQU0sZUFBZSxDQUFBO0FBRWhDLDBCQUEwQjtBQUMxQiwwQkFBMEI7QUFDMUIsMEJBQTBCO0FBRTFCLE1BQU0sVUFBVSxXQUFXLENBQUMsVUFBVSxHQUFDLENBQUMsTUFBTSxFQUFDLEVBQUUsR0FBQyxDQUFDO0lBQy9DLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ2hDLENBQUMsRUFBQyw0RUFBNEU7S0FDakYsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ2pCLElBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUNuQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN6QixJQUFHLFVBQVU7Z0JBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztTQUM5QzthQUNJLElBQUcsVUFBVTtZQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDcEQsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDO0FBRUQsTUFBTSxVQUFVLGlCQUFpQixDQUFDLElBQUksR0FBQyxtQkFBbUI7SUFDdEQsSUFBSSxJQUFJLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztJQUN4QixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNqQixJQUFJLENBQUMsUUFBUSxHQUFHLG9DQUFvQyxDQUFDO0lBQ3JELE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUMsVUFBVSxF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