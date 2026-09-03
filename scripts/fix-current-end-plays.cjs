const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'BochaScout.tsx');
const source = fs.readFileSync(file, 'utf8');
const duplicate = '    const currentEndPlays = playsHistory.filter((p) => p.end === currentEndName);';

if (source.includes(duplicate)) {
  fs.writeFileSync(file, source.replace(duplicate, ''), 'utf8');
  console.log('BochaScout.tsx: declaração duplicada de currentEndPlays removida.');
} else {
  console.log('BochaScout.tsx: nenhuma declaração duplicada encontrada.');
}
