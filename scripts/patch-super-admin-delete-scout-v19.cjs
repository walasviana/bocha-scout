const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');

if(src.includes('// PATCH: super-admin-delete-scout-v19')) process.exit(0);

function rep(a,b,label){
  if(src.includes(b)) return;
  if(!src.includes(a)) throw new Error('v19 trecho não encontrado: '+label);
  src=src.replace(a,b);
}

// O patch v18 pode não inserir o marcador quando um patch anterior já alterou a mesma linha.
// Portanto o v19 usa um marcador estável que certamente existe após o v17.
if (src.includes('// PATCH: super-admin-history-v17')) {
  src=src.replace('// PATCH: super-admin-history-v17','// PATCH: super-admin-history-v17\n// PATCH: super-admin-delete-scout-v19');
} else if (src.includes('import { supabase } from "../lib/supabase";')) {
  src=src.replace('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: super-admin-delete-scout-v19');
} else {
  throw new Error('v19 não encontrou ponto seguro para inserir marcador');
}

rep(
  'function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, ownerAccounts = [] }) {',
  'function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [] }) {',
  'history signature'
);

rep(
  '  const [selectedSessionId, setSelectedSessionId] = useState("");',
  `  const [selectedSessionId, setSelectedSessionId] = useState("");\n\n  async function deleteScout(item) {\n    if (!isSuperAdmin) return;\n    if (!window.confirm(\`Excluir definitivamente o Scout de \${item.athlete} × \${item.opponent}? Esta ação remove o Scout do banco de dados.\`)) return;\n    const { error } = await supabase.rpc('super_admin_delete_scout', { target_scout_id: item.id });\n    if (error) {\n      alert(error.message || 'Não foi possível excluir o Scout.');\n      return;\n    }\n    if (selectedSessionId === item.id) setSelectedSessionId("");\n    window.location.reload();\n  }`,
  'delete function'
);

rep(
  '  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);',
  '  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);\n  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);',
  'super admin state'
);

rep(
  '        setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && (p.role === "admin" || p.role === "super_admin")));',
  '        setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && (p.role === "admin" || p.role === "super_admin")));\n        setCurrentUserIsSuperAdmin(profiles.some((p) => p.id === currentUserId && p.role === "super_admin"));',
  'set super admin'
);

rep(
  '              isAdmin={currentUserIsAdmin}\n              ownerAccounts={ownerAccounts}',
  '              isAdmin={currentUserIsAdmin}\n              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}',
  'pass super admin'
);

const oldList='<button onClick={()=>setSelectedSessionId(item.id)} style={{...styles.button,background:"#2563eb",marginTop:8,padding:"9px 12px"}}>Ver análise completa</button>';
const newList='<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}><button onClick={()=>setSelectedSessionId(item.id)} style={{...styles.button,background:"#2563eb",padding:"9px 12px"}}>Ver análise completa</button>{isSuperAdmin && <button onClick={()=>deleteScout(item)} style={{...styles.button,background:"#b91c1c",padding:"9px 12px"}}>Excluir Scout</button>}</div>';
rep(oldList,newList,'history delete button');

fs.writeFileSync(file,src,'utf8');
console.log('super-admin-delete-scout-v19 aplicado');
