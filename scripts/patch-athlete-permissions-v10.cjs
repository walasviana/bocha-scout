const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: athlete-permissions-v10')) process.exit(0);

const regionStart = src.indexOf('function AthletesScreen');
const regionEnd = src.indexOf('function SessionDetail', regionStart);
if (regionStart < 0 || regionEnd < 0) throw new Error('v10: AthletesScreen não encontrado');
let before = src.slice(0, regionStart);
let region = src.slice(regionStart, regionEnd);
let after = src.slice(regionEnd);

region = region.replace(
  /<div style=\{styles\.card\}>\s*<h2>Cadastro de atleta<\/h2>[\s\S]*?<\/div>\s*\n\s*<div style=\{styles\.card\}>\s*<h2>Atletas cadastrados/,
  `<div style={styles.card}>\n        <h2>Cadastro de atleta</h2>\n        <p style={{ color: "#64748b", marginBottom: 0 }}>Use o botão <strong>Cadastrar atleta</strong> no topo do sistema. Contas comuns podem cadastrar atletas; edição e exclusão são exclusivas do administrador.</p>\n      </div>\n\n      <div style={styles.card}>\n        <h2>Atletas cadastrados`
);

region = region.replace(
  /\s*<button onClick=\{\(\) => onDelete\(a\.id\)\} style=\{\{ \.\.\.styles\.button, background: "#dc2626", padding: "8px 11px" \}\}>Excluir<\/button>/g,
  ''
);

src = before + region + after;
src = src.replace('import { supabase } from "../lib/supabase";', 'import { supabase } from "../lib/supabase";\n// PATCH: athlete-permissions-v10');

if (src.includes('onDelete(a.id)')) throw new Error('v10: botão excluir ainda presente');
if (!src.includes('edição e exclusão são exclusivas do administrador')) throw new Error('v10: aviso não aplicado');

fs.writeFileSync(file, src, 'utf8');
console.log('athlete-permissions-v10 aplicado');
