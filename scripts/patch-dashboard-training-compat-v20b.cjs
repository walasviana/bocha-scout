const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: dashboard-training-compat-v20b')) process.exit(0);

if (src.includes('// PATCH: ui-review-v20')) {
  src = src.replace('// PATCH: ui-review-v20', '// PATCH: ui-review-v20\n// PATCH: dashboard-training-compat-v20b');
} else {
  src = '// PATCH: dashboard-training-compat-v20b\n' + src;
}

// O patch v3 renomeia o adversário para Atleta Azul e alguns patches mudam
// a indentação. O v21 precisa de um ponto de inserção estável. Normalizamos
// apenas o início do segundo ramo Individual, sem alterar o conteúdo do campo.
const opponentStart = /\s*\{gameType === "Individual" \? \(\s*<Field label="(?:🔵 Atleta Azul|Atleta Azul|Adversário cadastrado)">/;
if (!opponentStart.test(src)) {
  throw new Error('v20b: início do campo do adversário não encontrado');
}
src = src.replace(
  opponentStart,
  '\n                {gameType === "Individual" ? (\n                  <Field label="Adversário cadastrado">'
);

fs.writeFileSync(file, src, 'utf8');
console.log('dashboard-training-compat-v20b aplicado');
