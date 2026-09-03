const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src', 'components', 'BochaScout.tsx');
let source = fs.readFileSync(file, 'utf8');

const pattern = /const\s+currentEndPlays\s*=\s*playsHistory\.filter\(\(p\)\s*=>\s*p\.end\s*===\s*currentEndName\);?/g;
const matches = [...source.matchAll(pattern)];

if (matches.length > 0) {
  // Mantém a declaração memoizada e remove somente as declarações simples duplicadas.
  source = source.replace(pattern, '');
  fs.writeFileSync(file, source, 'utf8');
  console.log(`BochaScout.tsx: ${matches.length} declaração(ões) duplicada(s) simples de currentEndPlays removida(s).`);
} else {
  console.log('BochaScout.tsx: nenhuma declaração simples duplicada de currentEndPlays encontrada.');
}
