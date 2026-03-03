const fs = require('fs');
const pdf = require('pdf-parse');

async function readAll() {
  const dir = '../';
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.pdf'));
  for (const f of files) {
    console.log(`\n\n--- CONTENT OF ${f} ---`);
    const dataBuffer = fs.readFileSync(dir + f);
    try {
      const data = await pdf(dataBuffer);
      console.log(data.text);
    } catch(err) {
      console.error(err);
    }
  }
}
readAll();
