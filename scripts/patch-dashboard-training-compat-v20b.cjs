const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: dashboard-training-compat-v20b')) process.exit(0);

// Localiza o campo do adversário pelo estado selectedOpponentId, que é mais
// estável do que depender do texto/emoji do label ou da indentação criada
// pelos patches anteriores.
const newViewStart = src.indexOf('{view === "new" && (');
if (newViewStart < 0) throw new Error('v20b: tela Novo Scout não encontrada');

const opponentSelectPos = src.indexOf('value={selectedOpponentId}', newViewStart);
if (opponentSelectPos < 0) throw new Error('v20b: select do adversário não encontrado');

const fieldStart = src.lastIndexOf('<Field ', opponentSelectPos);
if (fieldStart < newViewStart) throw new Error('v20b: Field do adversário não encontrado');

const branchStart = src.lastIndexOf('{gameType === "Individual" ? (', fieldStart);
if (branchStart < newViewStart) throw new Error('v20b: ramo Individual do adversário não encontrado');

const fieldOpenEnd = src.indexOf('>', fieldStart);
if (fieldOpenEnd < 0 || fieldOpenEnd > opponentSelectPos) {
  throw new Error('v20b: abertura do Field do adversário inválida');
}

const normalizedOpen = '{gameType === "Individual" ? (\n                  <Field label="Adversário cadastrado">';
src = src.slice(0, branchStart) + normalizedOpen + src.slice(fieldOpenEnd + 1);

if (src.includes('// PATCH: ui-review-v20')) {
  src = src.replace('// PATCH: ui-review-v20', '// PATCH: ui-review-v20\n// PATCH: dashboard-training-compat-v20b');
} else {
  src = '// PATCH: dashboard-training-compat-v20b\n' + src;
}

fs.writeFileSync(file, src, 'utf8');
console.log('dashboard-training-compat-v20b aplicado');
