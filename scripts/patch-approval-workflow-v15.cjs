const fs = require('fs');
const path = require('path');

function patchFile(rel, fn) {
  const file = path.join(process.cwd(), rel);
  let src = fs.readFileSync(file, 'utf8');
  const next = fn(src);
  fs.writeFileSync(file, next, 'utf8');
}

patchFile('src/components/AuthGate.tsx', (src) => {
  if (src.includes('// PATCH: approval-workflow-v15')) return src;
  src = src.replace("import AthleteRegistrationPanel from './AthleteRegistrationPanel';", "import AthleteRegistrationPanel from './AthleteRegistrationPanel';\nimport TeamRegistrationPanel from './TeamRegistrationPanel';\n// PATCH: approval-workflow-v15");
  src = src.replace("  const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);", "  const [showAthleteRegistration, setShowAthleteRegistration] = useState(false);\n  const [showTeamRegistration, setShowTeamRegistration] = useState(false);");
  src = src.replace("          <button onClick={() => setShowAthleteRegistration(true)} style={{ border: '1px solid #16a34a', background: '#15803d', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar atleta</button>", "          <button onClick={() => setShowAthleteRegistration(true)} style={{ border: '1px solid #16a34a', background: '#15803d', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar atleta</button>\n          <button onClick={() => setShowTeamRegistration(true)} style={{ border: '1px solid #60a5fa', background: '#2563eb', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Cadastrar Pares/Equipes</button>");
  src = src.replace("      {showAthleteRegistration && <AthleteRegistrationPanel user={user} onClose={() => setShowAthleteRegistration(false)} />}", "      {showAthleteRegistration && <AthleteRegistrationPanel user={user} onClose={() => setShowAthleteRegistration(false)} />}\n      {showTeamRegistration && <TeamRegistrationPanel user={user} onClose={() => setShowTeamRegistration(false)} />}");
  return src;
});

patchFile('src/components/AthleteRegistrationPanel.tsx', (src) => {
  if (src.includes('// PATCH: athlete-approval-v15')) return src;
  src = src.replace("// PATCH: uppercase-athlete-registration-v14", "// PATCH: uppercase-athlete-registration-v14\n// PATCH: athlete-approval-v15");
  src = src.replace("    if (error) return setMessage(error.message);\n    setMessage('Atleta cadastrado com sucesso.');", "    if (error) {\n      if (error.code === '23505') return setMessage('Esse atleta já está cadastrado nessa classe.');\n      return setMessage(error.message);\n    }\n    setMessage('Cadastro enviado para aprovação do administrador.');");
  src = src.replace("message.includes('sucesso')", "message.includes('aprovação')");
  return src;
});

patchFile('src/components/AdminPanel.tsx', (src) => {
  if (src.includes('// PATCH: admin-approval-v15')) return src;
  src = src.replace("// PATCH: admin-teams-uppercase-v14", "// PATCH: admin-teams-uppercase-v14\n// PATCH: admin-approval-v15");
  src = src.replace("supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at').order('name')", "supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at,approval_status').order('name')");
  src = src.replace("supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at').order('division').order('name')", "supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at,approval_status').order('division').order('name')");

  src = src.replace("  async function deleteAthlete(athlete: any) {", `  async function setAthleteApproval(athlete: any, status: 'approved' | 'rejected') {\n    const { error } = await supabase.rpc('admin_set_athlete_approval', { target_athlete_id: athlete.id, new_status: status });\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }\n\n  async function deleteAthlete(athlete: any) {`);

  src = src.replace("  async function deleteTeamEntry(item: any) {", `  async function setTeamApproval(item: any, status: 'approved' | 'rejected') {\n    const { error } = await supabase.rpc('admin_set_team_entry_approval', { target_entry_id: item.id, new_status: status });\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }\n\n  async function deleteTeamEntry(item: any) {`);

  src = src.replace("['Atleta','Classe','Gênero','País/UF','Cadastrado por','Ações']", "['Atleta','Classe','Gênero','País/UF','Cadastrado por','Status','Ações']");
  src = src.replace("<td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.created_by ? ownerById[a.created_by] || 'Conta' : 'Base oficial'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditing({ ...a })}", "<td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.created_by ? ownerById[a.created_by] || 'Conta' : 'Base oficial'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{a.approval_status === 'pending' ? 'Pendente' : a.approval_status === 'rejected' ? 'Rejeitado' : 'Aprovado'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{a.approval_status === 'pending' && <><button onClick={() => setAthleteApproval(a, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button><button onClick={() => setAthleteApproval(a, 'rejected')} style={{ ...button, background: '#f59e0b', color: '#fff' }}>Rejeitar</button></>}<button onClick={() => setEditing({ ...a })}");

  src = src.replace("['Nome','Tipo','Divisão','País','Ações']", "['Nome','Tipo','Divisão','País','Status','Ações']");
  src = src.replace("<td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.country || '-'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditingTeam({ ...item })}", "<td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.country || '-'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.approval_status === 'pending' ? 'Pendente' : item.approval_status === 'rejected' ? 'Rejeitado' : 'Aprovado'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{item.approval_status === 'pending' && <><button onClick={() => setTeamApproval(item, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button><button onClick={() => setTeamApproval(item, 'rejected')} style={{ ...button, background: '#f59e0b', color: '#fff' }}>Rejeitar</button></>}<button onClick={() => setEditingTeam({ ...item })}");
  return src;
});

patchFile('src/components/BochaScout.tsx', (src) => {
  if (src.includes('// PATCH: approved-only-selection-v15')) return src;
  src = src.replace('// PATCH: history-tb-v13', '// PATCH: history-tb-v13\n// PATCH: approved-only-selection-v15');
  src = src.replace('.select("id,name,class,country,uf,gender")\n        .order("name")', '.select("id,name,class,country,uf,gender,approval_status")\n        .eq("approval_status", "approved")\n        .order("name")');
  src = src.replace('.select("id,name,entity_type,division,country")\n        .order("entity_type")', '.select("id,name,entity_type,division,country,approval_status")\n        .eq("approval_status", "approved")\n        .order("entity_type")');
  return src;
});

console.log('approval-workflow-v15 aplicado');
