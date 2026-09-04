const fs=require('fs');
const path=require('path');

function patch(rel, fn){
  const file=path.join(process.cwd(), rel);
  let src=fs.readFileSync(file,'utf8');
  src=fn(src);
  fs.writeFileSync(file,src,'utf8');
}

patch('src/components/AuthGate.tsx',(src)=>{
  if(src.includes('// PATCH: super-admin-v17')) return src;
  src=src.replace("import TeamRegistrationPanel from './TeamRegistrationPanel';", "import TeamRegistrationPanel from './TeamRegistrationPanel';\n// PATCH: super-admin-v17");
  src=src.replace("  const isAdmin = profile?.role === 'admin';", "  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';\n  const isSuperAdmin = profile?.role === 'super_admin';");
  src=src.replace("          {isAdmin ? ' · Administrador' : ''}", "          {isSuperAdmin ? ' · Super Admin' : isAdmin ? ' · Administrador' : ''}");
  return src;
});

patch('src/components/BochaScout.tsx',(src)=>{
  if(src.includes('// PATCH: super-admin-history-v17')) return src;
  src=src.replace('// PATCH: own-pending-registration-v16', '// PATCH: own-pending-registration-v16\n// PATCH: super-admin-history-v17');
  src=src.replace('setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && p.role === "admin"));', 'setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && (p.role === "admin" || p.role === "super_admin")));');
  return src;
});

patch('src/components/AdminPanel.tsx',(src)=>{
  if(src.includes('// PATCH: super-admin-panel-v17')) return src;
  src=src.replace('// PATCH: admin-approval-v15', '// PATCH: admin-approval-v15\n// PATCH: super-admin-panel-v17');
  src=src.replace("{u.role === 'admin' ? 'Administrador' : 'Usuário'}", "{u.role === 'super_admin' ? 'Super Admin' : u.role === 'admin' ? 'Administrador' : 'Usuário'}");
  src=src.replace("<button onClick={() => changeBlock(u)} style={{ ...button, background: u.is_blocked ? '#15803d' : '#f59e0b', color: '#fff' }}>{u.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>\n                <button onClick={() => changeRole(u)} style={{ ...button, background: '#475569', color: '#fff' }}>{u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}</button>\n                <button onClick={() => deleteUser(u)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button>", "{u.role === 'super_admin' ? <span style={{ fontSize: 12, color: '#64748b', fontWeight: 700 }}>Conta protegida</span> : <>\n                <button onClick={() => changeBlock(u)} style={{ ...button, background: u.is_blocked ? '#15803d' : '#f59e0b', color: '#fff' }}>{u.is_blocked ? 'Desbloquear' : 'Bloquear'}</button>\n                <button onClick={() => changeRole(u)} style={{ ...button, background: '#475569', color: '#fff' }}>{u.role === 'admin' ? 'Tornar usuário' : 'Tornar admin'}</button>\n                <button onClick={() => deleteUser(u)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button>\n                </>}");
  return src;
});

console.log('super-admin-v17 aplicado');
