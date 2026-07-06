const https = require('https');

const projectId = "bali-adventure-web-gajah-1";
const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/services`;

https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        const json = JSON.parse(data);
        if (json.documents) {
            json.documents.forEach(doc => {
                const fields = doc.fields;
                console.log(`ID: ${doc.name.split('/').pop()}`);
                console.log(`Title EN: ${fields.title_en ? fields.title_en.stringValue : 'N/A'}`);
                console.log(`Title ID: ${fields.title_id ? fields.title_id.stringValue : 'N/A'}`);
                console.log(`Desc EN: ${fields.desc_en ? fields.desc_en.stringValue.substring(0, 50) + '...' : 'N/A'}`);
                console.log('---');
            });
        }
    });
}).on('error', err => {
    console.error("Error: ", err.message);
});
