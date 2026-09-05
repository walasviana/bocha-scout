const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: athlete-color-labels-v23')) process.exit(0);

function replaceAllRequired(from, to, label) {
  if (!src.includes(from)) throw new Error(`v23 trecho não encontrado: ${label}`);
  src = src.split(from).join(to);
}

// Apenas nomenclatura da interface. Não altera estados, filtros, regras ou persistência.
replaceAllRequired('Filtros do atleta analisado', '🔴 Atleta Vermelho', 'título atleta vermelho');
replaceAllRequired('Filtros do adversário', '🔵 Atleta Azul', 'título atleta azul');
replaceAllRequired('Adversário cadastrado', 'Atleta Azul', 'campo atleta azul');
replaceAllRequired('Classe do adversário', 'Classe do atleta azul', 'classe atleta azul');
replaceAllRequired('Gênero do adversário', 'Gênero do atleta azul', 'gênero atleta azul');

if (src.includes('// PATCH: dashboard-training-v21')) {
  src = src.replace('// PATCH: dashboard-training-v21', '// PATCH: dashboard-training-v21\n// PATCH: athlete-color-labels-v23');
} else {
  src = '// PATCH: athlete-color-labels-v23\n' + src;
}

fs.writeFileSync(file, src, 'utf8');
console.log('athlete-color-labels-v23 aplicado');
