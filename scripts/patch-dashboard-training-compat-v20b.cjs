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

// O patch v3 renomeia este campo para "Atleta Azul". O v21 usa um marcador
// neutro para inserir os filtros independentes. Esta compatibilidade apenas
// normaliza temporariamente o rótulo antes do v21.
src = src.replace('<Field label="🔵 Atleta Azul">', '<Field label="Adversário cadastrado">');

fs.writeFileSync(file, src, 'utf8');
console.log('dashboard-training-compat-v20b aplicado');
