import fs from 'fs';
const file = 'server/quote-cards.tsx';
let content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');
lines[42] = '    .replace(/"/g, """)';
content = lines.join('\n');
fs.writeFileSync(file, content);
console.log('Fixed');