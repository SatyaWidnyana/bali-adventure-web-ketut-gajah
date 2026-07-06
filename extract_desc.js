const fs = require('fs');
const json = JSON.parse(fs.readFileSync('mountain_guiding.json', 'utf8'));
const desc_en = json.fields.desc_en.stringValue;
const desc_id = json.fields.desc_id.stringValue;
fs.writeFileSync('desc_en.txt', desc_en);
fs.writeFileSync('desc_id.txt', desc_id);
console.log("Done");
