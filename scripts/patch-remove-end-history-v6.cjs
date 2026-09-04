const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: remove-end-history-v6')) {
  console.log('remove-end-history-v6 já aplicado');
  process.exit(0);
}

const startMarker = '          {/* =================================================\n              HISTÓRICO DO END\n          ================================================= */}';
const endMarker = '          {/* =================================================\n              SCOUT AO VIVO';

const start = src.indexOf(startMarker);
const end = src.indexOf(endMarker, start);

if (start < 0 || end < 0) {
  throw new Error('Bloco Jogadas do End não encontrado');
}

src = src.slice(0, start) + '          {/* PATCH: remove-end-history-v6 */}\n\n' + src.slice(end);

if (src.includes('Jogadas do {" "}') || src.includes('Nenhuma jogada registrada.</p>')) {
  // A frase pode existir em outras áreas; a validação principal é a remoção por marcadores.
}

fs.writeFileSync(file, src, 'utf8');
console.log('Bloco Jogadas do End removido com sucesso');
