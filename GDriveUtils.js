//Requires Google Drive API to be loaded in window with the correct developer API permissions enabled via a Google account
//For gapi including and usage: https://developers.google.com/drive/api/v3/quickstart/js


import fs from './BFSUtils.js'

//------------------------
//-GOOGLE DRIVE FUNCTIONS-
//------------------------
    
export function checkFolder(onResponse=(result)=>{}) {
    window.gapi.client.drive.files.list({
        q:"name='Brainsatplay_Data' and mimeType='application/vnd.google-apps.folder'",
    }).then((response) => {
        if(response.result.files.length === 0) {
            this.createDriveFolder();
            if(onResponse) onResponse(response.result);
        }
        else if(onResponse) onResponse(response.result);
    });
}

export function createDriveFolder(name='Brainsatplay_Data') {
    let data = new Object();
    data.name = name;
    data.mimeType = "application/vnd.google-apps.folder";
    window.gapi.client.drive.files.create({'resource': data}).then((response)=>{
        console.log(response.result);
    });
}

//backup file to drive by name (requires gapi authorization)
export const backupToDrive = (filename,directory='/data') => {
    if(window.gapi.auth2.getAuthInstance().isSignedIn.get()){
        fs.readFile(directory+'/'+filename,(e,output)=>{
            if(e) throw e;
            let file = new Blob([output.toString()],{type:'text/csv'});
            this.checkFolder((result)=>{
                let metadata = {
                    'name':filename+".csv",
                    'mimeType':'application/vnd.google-apps.spreadsheet',
                    'parents':[result.files[0].id]
                }
                let token = window.gapi.auth.getToken().access_token;
                var form = new FormData();
                form.append('metadata', new Blob([JSON.stringify(metadata)], {type: 'application/json'}));
                form.append('file', file);

                var xhr = new XMLHttpRequest();
                xhr.open('post', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id');
                xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                xhr.responseType = 'json';
                xhr.onload = () => {
                    console.log("Uploaded file id: ",xhr.response.id); // Retrieve uploaded file ID.
                    this.listDriveFiles();
                };
                xhr.send(form);
            });   
        });
    } else {
        alert("Sign in with Google first!")
    }
}


//doSomething(){}
export function listDriveFiles(onload=(files)=>{}) {
    checkFolder((result)=> {
        window.gapi.client.drive.files.list({
            q: `'${result.files[0].id}' in parents`,
            'pageSize': 10,
            'fields': "nextPageToken, files(id, name)"
        }).then((response) => {
            var files = response.result.files;
            if (files && files.length > 0) {
                onload(files);
            } else {
                return undefined;
            }
            });
    })
    
}

function onloadExample(files,backupdir='/data',ondownload=(filedata)=>{}) {
    document.getElementById('drivefiles').innerHTML = ``;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        document.getElementById(listDivId).insertAdjacentHTML('beforeend',`<div id=${file.id} style='border: 1px solid white;'>${file.name}<button id='${file.id}dload'>Download</button></div>`);
        document.getElementById(file.id+'dload').onclick = () => {
            
            //Get CSV data from drive
            var request = window.gapi.client.drive.files.export({'fileId': file.id, 'mimeType':'text/csv'});
            request.then((resp) => {
                let filename = file.name;
                fs.appendFile(backupdir+'/'+filename,resp.body,(e)=>{
                    if(e) throw e;
                    ondownload(resp.body);
                });
            });
        }
    }
}