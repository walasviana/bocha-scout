const fs = require('fs');
const path = require('path');

function patchFile(rel, fn) {
  const file = path.join(process.cwd(), rel);
  let src = fs.readFileSync(file, 'utf8');
  const next = fn(src);
  fs.writeFileSync(file, next, 'utf8');
}

patchFile('src/components/BochaScout.tsx', (src) => {
  if (src.includes('// PATCH: own-pending-usable-v16')) return src;
  src = src.replace('// PATCH: approved-only-selection-v15', '// PATCH: approved-only-selection-v15\n// PATCH: own-pending-usable-v16');

  src = src.replace(
    '.select("id,name,class,country,uf,gender,approval_status")\n        .eq("approval_status", "approved")\n        .order("name")',
    '.select("id,name,class,country,uf,gender,approval_status,created_by")\n        .order("name")'
  );

  src = src.replace(
    '      const databaseAthletes = (data || []).map((item) => ({',
    '      const { data: authData } = await supabase.auth.getUser();\n      const viewerId = authData.user?.id || "";\n      const selectableAthletes = (data || []).filter((item) => item.approval_status === "approved" || (item.approval_status === "pending" && item.created_by === viewerId));\n      const databaseAthletes = selectableAthletes.map((item) => ({'
  );

  src = src.replace(
    '.select("id,name,entity_type,division,country,approval_status")\n        .eq("approval_status", "approved")\n        .order("entity_type")',
    '.select("id,name,entity_type,division,country,approval_status,created_by")\n        .order("entity_type")'
  );

  src = src.replace(
    '      setTeamEntries(data || []);',
    '      const { data: authData } = await supabase.auth.getUser();\n      const viewerId = authData.user?.id || "";\n      setTeamEntries((data || []).filter((item) => item.approval_status === "approved" || (item.approval_status === "pending" && item.created_by === viewerId)));'
  );

  return src;
});

patchFile('src/components/AthleteRegistrationPanel.tsx', (src) => {
  if (src.includes('// PATCH: athlete-own-pending-v16')) return src;
  src = src.replace('// PATCH: athlete-approval-v15', '// PATCH: athlete-approval-v15\n// PATCH: athlete-own-pending-v16');
  src = src.replace(
    "setMessage('Cadastro enviado para aprovação do administrador.');",
    "setMessage('Cadastro salvo. Você já pode usar este atleta no seu Novo Scout. Ele só entra na base geral após aprovação do administrador.');"
  );
  src = src.replace("message.includes('aprovação')", "message.includes('Cadastro salvo')");
  return src;
});

patchFile('src/components/TeamRegistrationPanel.tsx', (src) => {
  if (src.includes('// PATCH: team-own-pending-v16')) return src;
  src = src.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\n// PATCH: team-own-pending-v16");
  src = src.replace(
    "setMessage('Cadastro enviado para aprovação do administrador.');",
    "setMessage('Cadastro salvo. Você já pode usar este país/clube no seu Novo Scout. Ele só entra na base geral após aprovação do administrador.');"
  );
  src = src.replace(
    'O cadastro fica pendente até aprovação do administrador.',
    'Você pode usar o cadastro imediatamente na sua conta. Para entrar na base geral, precisa de aprovação do administrador.'
  );
  src = src.replace("message.includes('aprovação')", "message.includes('Cadastro salvo')");
  src = src.replace(
    '<button onClick={onClose} style={{ ...button, background: \'#e2e8f0\', color: \'#0f172a\' }}>Fechar</button>',
    '<button onClick={() => { onClose(); if (message.includes(\'Cadastro salvo\')) window.location.reload(); }} style={{ ...button, background: \'#e2e8f0\', color: \'#0f172a\' }}>Fechar</button>'
  );
  return src;
});

console.log('own-pending-usable-v16 aplicado');
