import fs from 'fs';
const file = 'server/quote-cards.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/.replace\(\/\"\/g, """/g, '.replace(/\\"/g, """)');
fs.writeFileSync(file, content);
console.log('Fixed');