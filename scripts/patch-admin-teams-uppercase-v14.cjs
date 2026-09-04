const fs = require('fs');
const path = require('path');

function patchFile(rel, fn) {
  const file = path.join(process.cwd(), rel);
  let src = fs.readFileSync(file, 'utf8');
  const next = fn(src);
  fs.writeFileSync(file, next, 'utf8');
}

patchFile('src/components/AthleteRegistrationPanel.tsx', (src) => {
  if (src.includes('// PATCH: uppercase-athlete-registration-v14')) return src;
  src = src.replace(
    "import { supabase } from '../lib/supabase';",
    "import { supabase } from '../lib/supabase';\n// PATCH: uppercase-athlete-registration-v14"
  );
  src = src.replace("name: form.name.trim(),", "name: form.name.trim().toLocaleUpperCase('pt-BR'),");
  src = src.replace(
    "value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}",
    "value={form.name} onChange={e => setForm({ ...form, name: e.target.value.toLocaleUpperCase('pt-BR') })}"
  );
  return src;
});

patchFile('src/components/AdminPanel.tsx', (src) => {
  if (src.includes('// PATCH: admin-teams-uppercase-v14')) return src;

  function rep(from, to, label) {
    if (!src.includes(from)) throw new Error('v14 trecho não encontrado: ' + label);
    src = src.replace(from, to);
  }

  rep(
    "import { supabase } from '../lib/supabase';",
    "import { supabase } from '../lib/supabase';\n// PATCH: admin-teams-uppercase-v14",
    'marker'
  );

  rep(
    "const GENDERS = ['Masculino', 'Feminino'];",
    "const GENDERS = ['Masculino', 'Feminino'];\nconst TEAM_DIVISIONS = ['Equipe BC1/BC2', 'Par BC3', 'Par BC4'];\nconst TEAM_ENTITY_TYPES = ['Pais', 'Clube'];",
    'constants'
  );

  rep(
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'audit'>('overview');",
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'audit'>('overview');",
    'tab type'
  );

  rep(
    "  const [audit, setAudit] = useState<any[]>([]);",
    "  const [audit, setAudit] = useState<any[]>([]);\n  const [teamEntries, setTeamEntries] = useState<any[]>([]);\n  const [teamSearch, setTeamSearch] = useState('');\n  const [teamDivisionFilter, setTeamDivisionFilter] = useState('Todos');\n  const [teamTypeFilter, setTeamTypeFilter] = useState('Todos');\n  const [teamForm, setTeamForm] = useState({ name: '', entity_type: 'Pais', division: 'Equipe BC1/BC2', country: '' });\n  const [editingTeam, setEditingTeam] = useState<any | null>(null);",
    'team states'
  );

  rep(
    "      const [statsRes, usersRes, athletesRes, auditRes] = await Promise.all([",
    "      const [statsRes, usersRes, athletesRes, teamRes, auditRes] = await Promise.all([",
    'load tuple'
  );

  rep(
    "        supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at').order('name'),\n        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),",
    "        supabase.from('athletes').select('id,name,class,gender,country,uf,observations,created_by,created_at,updated_at').order('name'),\n        supabase.from('boccia_team_entries').select('id,name,entity_type,division,country,created_by,created_at,updated_at').order('division').order('name'),\n        supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(100),",
    'load teams query'
  );

  rep(
    "      if (athletesRes.error) throw athletesRes.error;\n      if (auditRes.error) throw auditRes.error;",
    "      if (athletesRes.error) throw athletesRes.error;\n      if (teamRes.error) throw teamRes.error;\n      if (auditRes.error) throw auditRes.error;",
    'team error'
  );

  rep(
    "      setAthletes(athletesRes.data || []);\n      setAudit(auditRes.data || []);",
    "      setAthletes(athletesRes.data || []);\n      setTeamEntries(teamRes.data || []);\n      setAudit(auditRes.data || []);",
    'set teams'
  );

  rep(
    "      new_name: editing.name.trim(),",
    "      new_name: editing.name.trim().toLocaleUpperCase('pt-BR'),",
    'uppercase admin athlete save'
  );

  rep(
    "<input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })}",
    "<input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value.toLocaleUpperCase('pt-BR') })}",
    'uppercase athlete edit input'
  );

  rep(
    "  async function deleteAthlete(athlete: any) {\n    if (!window.confirm(`Excluir definitivamente o atleta ${athlete.name}?`)) return;\n    const { error } = await supabase.rpc('admin_delete_athlete', { target_athlete_id: athlete.id });\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }",
    `  async function deleteAthlete(athlete: any) {\n    if (!window.confirm(\`Excluir definitivamente o atleta \${athlete.name}?\`)) return;\n    const { error } = await supabase.rpc('admin_delete_athlete', { target_athlete_id: athlete.id });\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }\n\n  const visibleTeamEntries = useMemo(() => teamEntries.filter(item => {\n    const q = teamSearch.trim().toLowerCase();\n    const textOk = !q || [item.name, item.country, item.division, item.entity_type].some(v => String(v || '').toLowerCase().includes(q));\n    const divisionOk = teamDivisionFilter === 'Todos' || item.division === teamDivisionFilter;\n    const typeOk = teamTypeFilter === 'Todos' || item.entity_type === teamTypeFilter;\n    return textOk && divisionOk && typeOk;\n  }), [teamEntries, teamSearch, teamDivisionFilter, teamTypeFilter]);\n\n  async function addTeamEntry() {\n    if (!teamForm.name.trim()) return setMessage('Informe o nome do país ou clube.');\n    const { data: authData } = await supabase.auth.getUser();\n    const { error } = await supabase.from('boccia_team_entries').insert({\n      name: teamForm.name.trim().toLocaleUpperCase('pt-BR'),\n      entity_type: teamForm.entity_type,\n      division: teamForm.division,\n      country: teamForm.country.trim() || null,\n      created_by: authData.user?.id || null,\n    });\n    if (error) return setMessage(error.message);\n    setTeamForm({ name: '', entity_type: 'Pais', division: 'Equipe BC1/BC2', country: '' });\n    await loadAll();\n  }\n\n  async function saveTeamEntry() {\n    if (!editingTeam?.name?.trim()) return setMessage('Informe o nome do país ou clube.');\n    const { error } = await supabase.from('boccia_team_entries').update({\n      name: editingTeam.name.trim().toLocaleUpperCase('pt-BR'),\n      entity_type: editingTeam.entity_type,\n      division: editingTeam.division,\n      country: editingTeam.country?.trim() || null,\n      updated_at: new Date().toISOString(),\n    }).eq('id', editingTeam.id);\n    if (error) return setMessage(error.message);\n    setEditingTeam(null);\n    await loadAll();\n  }\n\n  async function deleteTeamEntry(item: any) {\n    if (!window.confirm(\`Excluir definitivamente \${item.name} de \${item.division}?\`)) return;\n    const { error } = await supabase.from('boccia_team_entries').delete().eq('id', item.id);\n    if (error) return setMessage(error.message);\n    await loadAll();\n  }`,
    'team functions'
  );

  rep(
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['audit','Auditoria']].map(([id,label]) => (",
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['audit','Auditoria']].map(([id,label]) => (",
    'admin nav teams'
  );

  rep(
    "        {!loading && tab === 'audit' && <div style={card}>",
    `        {!loading && tab === 'teams' && <div style={card}>\n          <h2 style={{ marginTop: 0 }}>Pares / Equipes</h2>\n          <p style={{ color: '#64748b', marginTop: -4 }}>Gerencie países e clubes disponíveis em Equipe BC1/BC2, Par BC3 e Par BC4.</p>\n          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: 8, marginBottom: 12 }}>\n            <input placeholder=\"Nome do país ou clube\" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value.toLocaleUpperCase('pt-BR') })} style={input} />\n            <select value={teamForm.entity_type} onChange={e => setTeamForm({ ...teamForm, entity_type: e.target.value })} style={input}>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>\n            <select value={teamForm.division} onChange={e => setTeamForm({ ...teamForm, division: e.target.value })} style={input}>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>\n            <input placeholder=\"País (opcional para clube)\" value={teamForm.country} onChange={e => setTeamForm({ ...teamForm, country: e.target.value })} style={input} />\n            <button onClick={addTeamEntry} style={{ ...button, background: '#15803d', color: '#fff' }}>Adicionar</button>\n          </div>\n          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8, marginBottom: 12 }}>\n            <input placeholder=\"Buscar nome, país ou divisão\" value={teamSearch} onChange={e => setTeamSearch(e.target.value)} style={input} />\n            <select value={teamDivisionFilter} onChange={e => setTeamDivisionFilter(e.target.value)} style={input}><option>Todos</option>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>\n            <select value={teamTypeFilter} onChange={e => setTeamTypeFilter(e.target.value)} style={input}><option>Todos</option>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>\n          </div>\n          <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>\n            <thead><tr>{['Nome','Tipo','Divisão','País','Ações'].map(x => <th key={x} style={{ textAlign: 'left', padding: 9, borderBottom: '1px solid #cbd5e1' }}>{x}</th>)}</tr></thead>\n            <tbody>{visibleTeamEntries.map(item => <tr key={item.id}>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><strong>{item.name}</strong></td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.entity_type}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.division}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}>{item.country || '-'}</td>\n              <td style={{ padding: 9, borderBottom: '1px solid #e2e8f0' }}><div style={{ display: 'flex', gap: 6 }}><button onClick={() => setEditingTeam({ ...item })} style={{ ...button, background: '#2563eb', color: '#fff' }}>Editar</button><button onClick={() => deleteTeamEntry(item)} style={{ ...button, background: '#b91c1c', color: '#fff' }}>Excluir</button></div></td>\n            </tr>)}</tbody>\n          </table></div>\n        </div>}\n\n        {!loading && tab === 'audit' && <div style={card}>`,
    'teams tab ui'
  );

  rep(
    "      {editing && <div style={{ position: 'fixed'",
    `      {editingTeam && <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(15,23,42,.55)', display: 'grid', placeItems: 'center', padding: 16 }}>\n        <div style={{ ...card, width: 'min(560px,100%)' }}>\n          <h2 style={{ marginTop: 0 }}>Editar país / clube</h2>\n          <div style={{ display: 'grid', gap: 9 }}>\n            <input value={editingTeam.name || ''} onChange={e => setEditingTeam({ ...editingTeam, name: e.target.value.toLocaleUpperCase('pt-BR') })} style={input} placeholder=\"Nome\" />\n            <select value={editingTeam.entity_type || 'Pais'} onChange={e => setEditingTeam({ ...editingTeam, entity_type: e.target.value })} style={input}>{TEAM_ENTITY_TYPES.map(x => <option key={x}>{x}</option>)}</select>\n            <select value={editingTeam.division || 'Equipe BC1/BC2'} onChange={e => setEditingTeam({ ...editingTeam, division: e.target.value })} style={input}>{TEAM_DIVISIONS.map(x => <option key={x}>{x}</option>)}</select>\n            <input value={editingTeam.country || ''} onChange={e => setEditingTeam({ ...editingTeam, country: e.target.value })} style={input} placeholder=\"País\" />\n            <div style={{ display: 'flex', gap: 8 }}><button onClick={saveTeamEntry} style={{ ...button, background: '#15803d', color: '#fff', flex: 1 }}>Salvar alterações</button><button onClick={() => setEditingTeam(null)} style={{ ...button, background: '#cbd5e1', color: '#0f172a', flex: 1 }}>Cancelar</button></div>\n          </div>\n        </div>\n      </div>}\n\n      {editing && <div style={{ position: 'fixed'`,
    'team edit modal'
  );

  return src;
});

console.log('admin-teams-uppercase-v14 aplicado');
