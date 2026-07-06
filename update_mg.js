const https = require('https');
const fs = require('fs');

const projectId = "bali-adventure-web-gajah-1";
const docId = "hMxd05t8xJWQooLVMGHd";

// Read current data
const json = JSON.parse(fs.readFileSync('mountain_guiding.json', 'utf8'));

// Update desc_en
let desc_en = json.fields.desc_en.stringValue;
desc_en = desc_en.replace(/ m/g, ' masl');
// Fix the text if it says "maslasl" by accident just in case
desc_en = desc_en.replace(/maslasl/g, 'masl');

const updateData = {
    fields: {
        ...json.fields,
        desc_en: { stringValue: desc_en }
    }
};

const postData = JSON.stringify(updateData);

const options = {
    hostname: 'firestore.googleapis.com',
    port: 443,
    path: `/v1/projects/${projectId}/databases/(default)/documents/services/${docId}`,
    method: 'PATCH',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log('Update status code:', res.statusCode);
        console.log('Update response:', data);
    });
});

req.on('error', (e) => {
    console.error('Error:', e);
});

req.write(postData);
req.end();
