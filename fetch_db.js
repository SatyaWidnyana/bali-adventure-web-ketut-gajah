const https = require('https');

const projectId = "bali-adventure-web-gajah-1";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/services`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    });
}).on('error', err => {
    console.error("Error: ", err.message);
});
