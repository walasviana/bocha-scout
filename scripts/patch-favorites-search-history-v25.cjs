const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: favorites-search-history-v25')) process.exit(0);
function rep(a,b,label){ if(src.includes(b)) return; if(!src.includes(a)) throw new Error('v25 trecho não encontrado: '+label); src=src.replace(a,b); }

if (src.includes('// PATCH: filters-evolution-data-v24')) {
  src = src.replace('// PATCH: filters-evolution-data-v24', '// PATCH: filters-evolution-data-v24\n// PATCH: favorites-search-history-v25');
} else if (src.includes('import { supabase } from "../lib/supabase";')) {
  src = src.replace('import { supabase } from "../lib/supabase";', 'import { supabase } from "../lib/supabase";\n// PATCH: favorites-search-history-v25');
} else {
  throw new Error('v25 marcador seguro não encontrado');
}

// ---------------------------------------------------------
// Favoritos por conta + pesquisa por nome no Novo Scout
// ---------------------------------------------------------
rep(
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");',
  `  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [favoriteAthleteIds, setFavoriteAthleteIds] = useState([]);\n  const [athleteNameSearch, setAthleteNameSearch] = useState("");\n  const [opponentNameSearch, setOpponentNameSearch] = useState("");\n\n  useEffect(() => {\n    let active = true;\n    (async () => {\n      const { data: { user } } = await supabase.auth.getUser();\n      if (!user) return;\n      const { data, error } = await supabase.from('user_favorite_athletes').select('athlete_id').eq('user_id', user.id);\n      if (!error && active) setFavoriteAthleteIds((data || []).map((row) => row.athlete_id));\n    })();\n    return () => { active = false; };\n  }, []);\n\n  async function toggleFavoriteAthlete(athleteId) {\n    if (!athleteId) return;\n    const { data: { user } } = await supabase.auth.getUser();\n    if (!user) { alert('Faça login para salvar favoritos.'); return; }\n    const isFavorite = favoriteAthleteIds.includes(athleteId);\n    if (isFavorite) {\n      const { error } = await supabase.from('user_favorite_athletes').delete().eq('user_id', user.id).eq('athlete_id', athleteId);\n      if (error) { alert(error.message || 'Não foi possível remover o favorito.'); return; }\n      setFavoriteAthleteIds((prev) => prev.filter((id) => id !== athleteId));\n    } else {\n      const { error } = await supabase.from('user_favorite_athletes').insert({ user_id: user.id, athlete_id: athleteId });\n      if (error && error.code !== '23505') { alert(error.message || 'Não foi possível salvar o favorito.'); return; }\n      setFavoriteAthleteIds((prev) => prev.includes(athleteId) ? prev : [...prev, athleteId]);\n    }\n  }`,
  'estado e persistência de favoritos'
);

// Filtros do atleta vermelho: classe + gênero + nome e favoritos primeiro.
const primaryRe = /  const filteredPrimaryAthletes = availableAthletes\.filter\(\(item\) => \{[\s\S]*?\n  \}\);/;
if (!primaryRe.test(src)) throw new Error('v25 filtro atleta vermelho não encontrado');
src = src.replace(primaryRe, `  const filteredPrimaryAthletes = availableAthletes.filter((item) => {\n    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : athleteClassFilter;\n    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : athleteGenderFilter;\n    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;\n    const genderOk = activeGender === "Todos" || item.gender === activeGender;\n    const nameOk = !athleteNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").includes(athleteNameSearch.trim().toLocaleLowerCase("pt-BR"));\n    return classOk && genderOk && nameOk;\n  }).sort((a,b) => {\n    const fav = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));\n    return fav || a.name.localeCompare(b.name, "pt-BR");\n  });`);

const opponentRe = /  const filteredOpponentAthletes = availableAthletes\.filter\(\(item\) => \{[\s\S]*?\n  \}\);/;
if (!opponentRe.test(src)) throw new Error('v25 filtro atleta azul não encontrado');
src = src.replace(opponentRe, `  const filteredOpponentAthletes = availableAthletes.filter((item) => {\n    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : opponentClassFilter;\n    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : opponentGenderFilter;\n    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;\n    const genderOk = activeGender === "Todos" || item.gender === activeGender;\n    const nameOk = !opponentNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").includes(opponentNameSearch.trim().toLocaleLowerCase("pt-BR"));\n    return classOk && genderOk && nameOk;\n  }).sort((a,b) => {\n    const fav = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));\n    return fav || a.name.localeCompare(b.name, "pt-BR");\n  });`);

// Pesquisa fica junto do próprio seletor de atleta; estrela marca/desmarca o selecionado.
rep(
  '                  <Field label="Atleta">\n                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>',
  `                  <Field label={<span style={{display:"inline-flex",alignItems:"center",gap:7}}><span style={{width:12,height:12,borderRadius:"50%",background:"#dc2626",display:"inline-block",flex:"0 0 12px"}} />Atleta Vermelho</span>}>\n                    <input value={athleteNameSearch} onChange={(e) => setAthleteNameSearch(e.target.value)} placeholder="🔎 Digite o nome do atleta" style={{...styles.input,marginBottom:7}} />\n                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>`,
  'pesquisa atleta vermelho'
);
rep(
  '<option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>',
  '<option key={item.id} value={item.id}>{favoriteAthleteIds.includes(item.id) ? "★ " : ""}{item.name} · {item.athleteClass}</option>',
  'estrela opções atleta vermelho'
);
rep(
  '                    </select>\n                    {athletes.length === 0 && (',
  `                    </select>\n                    <button type="button" disabled={!selectedAthleteId} onClick={() => toggleFavoriteAthlete(selectedAthleteId)} style={{...styles.button,background:selectedAthleteId && favoriteAthleteIds.includes(selectedAthleteId)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:selectedAthleteId?1:.55}}>{selectedAthleteId && favoriteAthleteIds.includes(selectedAthleteId) ? "★ Favorito" : "☆ Favoritar atleta"}</button>\n                    {athletes.length === 0 && (`,
  'botão favorito atleta vermelho'
);

rep(
  '                  <Field label="🔵 Atleta Azul">\n                    <select',
  `                  <Field label={<span style={{display:"inline-flex",alignItems:"center",gap:7}}><span style={{width:12,height:12,borderRadius:"50%",background:"#2563eb",display:"inline-block",flex:"0 0 12px"}} />Atleta Azul</span>}>\n                    <input value={opponentNameSearch} onChange={(e) => setOpponentNameSearch(e.target.value)} placeholder="🔎 Digite o nome do atleta" style={{...styles.input,marginBottom:7}} />\n                    <select`,
  'pesquisa atleta azul'
);
// A segunda ocorrência das opções pertence ao atleta azul e já recebe ★ porque a primeira substituição é global em runtime por split abaixo.
src = src.split('<option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>').join('<option key={item.id} value={item.id}>{favoriteAthleteIds.includes(item.id) ? "★ " : ""}{item.name} · {item.athleteClass}</option>');
rep(
  '                    </select>\n                    {selectedAthleteId && eligibleOpponents.length === 0 && (',
  `                    </select>\n                    <button type="button" disabled={!selectedOpponentId} onClick={() => toggleFavoriteAthlete(selectedOpponentId)} style={{...styles.button,background:selectedOpponentId && favoriteAthleteIds.includes(selectedOpponentId)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:selectedOpponentId?1:.55}}>{selectedOpponentId && favoriteAthleteIds.includes(selectedOpponentId) ? "★ Favorito" : "☆ Favoritar atleta"}</button>\n                    {selectedAthleteId && eligibleOpponents.length === 0 && (`,
  'botão favorito atleta azul'
);

// Padroniza as bolinhas dos cabeçalhos de filtros, sem depender do tamanho do emoji do aparelho.
src = src.replace('>🔴 Atleta Vermelho</div>', '><span style={{width:12,height:12,borderRadius:"50%",background:"#dc2626",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Vermelho</div>');
src = src.replace('>🔵 Atleta Azul</div>', '><span style={{width:12,height:12,borderRadius:"50%",background:"#2563eb",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Azul</div>');

// ---------------------------------------------------------
// Campeonato: nível Nacional / Internacional
// ---------------------------------------------------------
rep(
  '  const [competitionPhase, setCompetitionPhase] = useState("");',
  '  const [competitionPhase, setCompetitionPhase] = useState("");\n  const [competitionLevel, setCompetitionLevel] = useState("Nacional");',
  'estado nível campeonato'
);
const phaseField = `                    <div style={{ gridColumn: "1 / -1" }}>\n                      <Field label="Fase do campeonato">\n                        <input value={competitionPhase} onChange={(e) => setCompetitionPhase(e.target.value)} placeholder="Ex.: Fase classificatória, semifinal, final" style={styles.input} />\n                      </Field>\n                    </div>`;
rep(
  phaseField,
  phaseField + `\n                    <div style={{ gridColumn: "1 / -1" }}>\n                      <Field label="Nível do campeonato">\n                        <select value={competitionLevel} onChange={(e) => setCompetitionLevel(e.target.value)} style={styles.input}><option>Nacional</option><option>Internacional</option></select>\n                      </Field>\n                    </div>`,
  'campo nível campeonato'
);
src = src.replace('    setCompetitionPhase("");\n', '    setCompetitionPhase("");\n    setCompetitionLevel("Nacional");\n');
src = src.replace('setCompetitionPhase(""); setView("new");', 'setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new");');
rep(
  '          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",',
  '          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",\n          competitionLevel: sessionKind === "Campeonato" ? competitionLevel : "",\n          athleteGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedAthleteId)?.gender || "") : "",\n          opponentGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedOpponentId)?.gender || "") : "",',
  'persistir nível e gêneros'
);

// ---------------------------------------------------------
// Histórico: busca + favoritos + classe + gênero + nível
// ---------------------------------------------------------
rep(
  'function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [] }) {',
  'function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [], favoriteAthleteIds = [], onToggleFavorite }) {',
  'history props favoritos'
);
rep(
  '  const [selectedSessionId, setSelectedSessionId] = useState("");',
  `  const [selectedSessionId, setSelectedSessionId] = useState("");\n  const [historyAthleteSearch, setHistoryAthleteSearch] = useState("");\n  const [historyClassFilter, setHistoryClassFilter] = useState("Todos");\n  const [historyGenderFilter, setHistoryGenderFilter] = useState("Todos");\n  const [historyLevelFilter, setHistoryLevelFilter] = useState("Todos");\n  const historyAthletes = useMemo(() => athletes.filter((a) => {\n    const classOk = historyClassFilter === "Todos" || a.athleteClass === historyClassFilter;\n    const genderOk = historyGenderFilter === "Todos" || a.gender === historyGenderFilter;\n    const nameOk = !historyAthleteSearch.trim() || a.name.toLocaleLowerCase("pt-BR").includes(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"));\n    return classOk && genderOk && nameOk;\n  }).sort((a,b) => {\n    const fav = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));\n    return fav || a.name.localeCompare(b.name, "pt-BR");\n  }), [athletes, historyClassFilter, historyGenderFilter, historyAthleteSearch, favoriteAthleteIds]);`,
  'history states'
);

const filteredOld = '    const selectedColor = colorForSelectedAthlete(s);\n    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;';
const filteredNew = `    const selectedColor = colorForSelectedAthlete(s);\n    const role = athleteRole(s);\n    const roleClass = role === "adversario" ? s.opponentClass : s.athleteClass;\n    const roleGender = role === "adversario" ? (s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender || "") : (s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender || "");\n    const classOk = historyClassFilter === "Todos" || (athleteFilter === "Todos" ? s.athleteClass === historyClassFilter || s.opponentClass === historyClassFilter : roleClass === historyClassFilter);\n    const genderOk = historyGenderFilter === "Todos" || (athleteFilter === "Todos" ? (s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender) === historyGenderFilter || (s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender) === historyGenderFilter : roleGender === historyGenderFilter);\n    const levelOk = historyLevelFilter === "Todos" || (s.sessionKind === "Campeonato" && s.competitionLevel === historyLevelFilter);\n    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && classOk && genderOk && levelOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;`;
rep(filteredOld, filteredNew, 'filtros combinados histórico');

rep(
  '<Field label="Atleta"><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>',
  `<Field label="🔎 Atleta"><input value={historyAthleteSearch} onChange={e=>setHistoryAthleteSearch(e.target.value)} placeholder="Digite o nome" style={{...styles.input,marginBottom:7}}/><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{historyAthletes.map(a=><option key={a.id} value={a.id}>{favoriteAthleteIds.includes(a.id)?"★ ":""}{a.name}</option>)}</select><button type="button" disabled={athleteFilter==="Todos"} onClick={()=>athleteFilter!=="Todos"&&onToggleFavorite?.(athleteFilter)} style={{...styles.button,background:athleteFilter!=="Todos"&&favoriteAthleteIds.includes(athleteFilter)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:athleteFilter!=="Todos"?1:.55}}>{athleteFilter!=="Todos"&&favoriteAthleteIds.includes(athleteFilter)?"★ Favorito":"☆ Favoritar atleta"}</button></Field>\n        <Field label="Classe"><select value={historyClassFilter} onChange={e=>{setHistoryClassFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></Field>\n        <Field label="Gênero"><select value={historyGenderFilter} onChange={e=>{setHistoryGenderFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></Field>\n        <Field label="Nível"><select value={historyLevelFilter} onChange={e=>setHistoryLevelFilter(e.target.value)} style={styles.input}><option>Todos</option><option>Nacional</option><option>Internacional</option></select></Field>`,
  'ui filtros histórico'
);

// Passa favoritos para o Histórico.
rep(
  '              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}',
  '              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}\n              favoriteAthleteIds={favoriteAthleteIds}\n              onToggleFavorite={toggleFavoriteAthlete}',
  'props histórico favoritos'
);

fs.writeFileSync(file, src, 'utf8');
console.log('favorites-search-history-v25 aplicado');
