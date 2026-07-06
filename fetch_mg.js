const https = require('https');
const fs = require('fs');

const projectId = "bali-adventure-web-gajah-1";
const docId = "hMxd05t8xJWQooLVMGHd";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/services/${docId}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        fs.writeFileSync('mountain_guiding.json', JSON.stringify(json, null, 2));
        console.log("Saved to mountain_guiding.json");
    });
}).on('error', err => {
    console.error("Error: ", err.message);
});
