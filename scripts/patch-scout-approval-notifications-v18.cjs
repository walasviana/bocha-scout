const fs=require('fs');
const path=require('path');

function patch(rel, fn){
  const file=path.join(process.cwd(),rel);
  let src=fs.readFileSync(file,'utf8');
  src=fn(src);
  fs.writeFileSync(file,src,'utf8');
}

patch('src/components/AdminPanel.tsx',(src)=>{
  if(src.includes('// PATCH: scout-approval-notifications-v18')) return src;
  src=src.replace('// PATCH: super-admin-panel-v17','// PATCH: super-admin-panel-v17\n// PATCH: scout-approval-notifications-v18');

  src=src.replace(
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'audit'>('overview');",
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'notifications' | 'audit'>('overview');"
  );

  src=src.replace(
    "  const [teamEntries, setTeamEntries] = useState<any[]>([]);",
    "  const [teamEntries, setTeamEntries] = useState<any[]>([]);\n  const [notifications, setNotifications] = useState<any[]>([]);"
  );

  src=src.replace(
    "const [statsRes, usersRes, athletesRes, teamRes, auditRes] = await Promise.all([",
    "const [statsRes, usersRes, athletesRes, teamRes, notificationsRes, auditRes] = await Promise.all(["
  );

  src=src.replace(
    "        supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at,approval_status').order('division').order('name'),\n        supabase.from('audit_log')",
    "        supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at,approval_status').order('division').order('name'),\n        supabase.from('admin_notifications').select('id,source_type,source_id,requester_id,title,message,status,created_at,resolved_at,resolved_by').order('created_at', { ascending: false }),\n        supabase.from('audit_log')"
  );

  src=src.replace(
    "      if (teamRes.error) throw teamRes.error;\n      if (auditRes.error) throw auditRes.error;",
    "      if (teamRes.error) throw teamRes.error;\n      if (notificationsRes.error) throw notificationsRes.error;\n      if (auditRes.error) throw auditRes.error;"
  );

  src=src.replace(
    "      setTeamEntries(teamRes.data || []);\n      setAudit(auditRes.data || []);",
    "      setTeamEntries(teamRes.data || []);\n      setNotifications(notificationsRes.data || []);\n      setAudit(auditRes.data || []);"
  );

  src=src.replace(
    "  async function deleteTeamEntry(item: any) {",
    `  const pendingNotifications = notifications.filter(n => n.status === 'pending');\n\n  async function resolveNotification(item: any, status: 'approved' | 'rejected') {\n    let error: any = null;\n    if (item.source_type === 'athlete') {\n      ({ error } = await supabase.rpc('admin_set_athlete_approval', { target_athlete_id: item.source_id, new_status: status }));\n    } else if (item.source_type === 'team_entry') {\n      ({ error } = await supabase.rpc('admin_set_team_entry_approval', { target_entry_id: item.source_id, new_status: status }));\n    } else if (item.source_type === 'scout') {\n      ({ error } = await supabase.rpc('admin_set_scout_approval', { target_session_id: item.source_id, new_status: status }));\n    }\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }\n\n  async function deleteTeamEntry(item: any) {`
  );

  src=src.replace(
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['audit','Auditoria']].map(([id,label]) => (",
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['notifications',`Notificações (${pendingNotifications.length})`],['audit','Auditoria']].map(([id,label]) => ("
  );

  const auditAnchor="        {!loading && tab === 'audit' && <div style={card}>";
  if(!src.includes(auditAnchor)) throw new Error('v18: anchor auditoria não encontrado');
  src=src.replace(auditAnchor,`        {!loading && tab === 'notifications' && <div style={card}>\n          <h2 style={{ marginTop: 0 }}>Notificações e aprovações</h2>\n          <p style={{ color: '#64748b' }}>Pedidos de atletas, pares/equipes e Scouts enviados por contas comuns.</p>\n          {pendingNotifications.length === 0 ? <p>Nenhum pedido pendente.</p> : pendingNotifications.map(item => <div key={item.id} style={{ padding: '12px 0', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>\n            <div>\n              <strong>{item.title}</strong>\n              <div style={{ color: '#475569', marginTop: 3 }}>{item.message || '-'}</div>\n              <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>Solicitado por: {ownerById[item.requester_id] || 'Conta'} · {fmt(item.created_at)}</div>\n            </div>\n            <div style={{ display: 'flex', gap: 7 }}>\n              <button onClick={() => resolveNotification(item, 'approved')} style={{ ...button, background: '#15803d', color: '#fff' }}>Aprovar</button>\n              <button onClick={() => resolveNotification(item, 'rejected')} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Rejeitar</button>\n            </div>\n          </div>)}\n        </div>}\n\n${auditAnchor}`);
  return src;
});

patch('src/components/BochaScout.tsx',(src)=>{
  if(src.includes('// PATCH: scout-approval-status-v18')) return src;
  src=src.replace('// PATCH: super-admin-history-v17','// PATCH: super-admin-history-v17\n// PATCH: scout-approval-status-v18');
  src=src.replace(
    'select("id,owner_id,session_date,session_kind,game_type,athlete_id,opponent_id,athlete_name,opponent_name,payload,created_at,updated_at")',
    'select("id,owner_id,session_date,session_kind,game_type,athlete_id,opponent_id,athlete_name,opponent_name,payload,approval_status,created_at,updated_at")'
  );
  src=src.replace(
    'createdAt: p.createdAt || row.created_at,',
    'approvalStatus: row.approval_status || p.approvalStatus || "approved",\n            createdAt: p.createdAt || row.created_at,'
  );
  return src;
});

console.log('scout-approval-notifications-v18 aplicado');
