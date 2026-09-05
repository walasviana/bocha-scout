const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');

if(src.includes('// PATCH: favorites-search-history-v25b')) process.exit(0);
function mustReplace(from,to,label){
  if(src.includes(to)) return;
  if(!src.includes(from)) throw new Error('v25b trecho não encontrado: '+label);
  src=src.replace(from,to);
}

if(src.includes('// PATCH: filters-evolution-data-v24')) src=src.replace('// PATCH: filters-evolution-data-v24','// PATCH: filters-evolution-data-v24\n// PATCH: favorites-search-history-v25b');
else throw new Error('v25b marcador v24 não encontrado');

// ---------- Favoritos por conta ----------
mustReplace(
'  const [selectedOpponentId, setSelectedOpponentId] = useState("");',
`  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [favoriteAthleteIds, setFavoriteAthleteIds] = useState([]);
  const [athleteNameSearch, setAthleteNameSearch] = useState("");
  const [opponentNameSearch, setOpponentNameSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("user_favorite_athletes").select("athlete_id").eq("user_id", user.id);
      if (!error && active) setFavoriteAthleteIds((data || []).map((row) => row.athlete_id));
    })();
    return () => { active = false; };
  }, []);

  async function toggleFavoriteAthlete(athleteId) {
    if (!athleteId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isFavorite = favoriteAthleteIds.includes(athleteId);
    if (isFavorite) {
      const { error } = await supabase.from("user_favorite_athletes").delete().eq("user_id", user.id).eq("athlete_id", athleteId);
      if (error) { alert(error.message || "Não foi possível remover o favorito."); return; }
      setFavoriteAthleteIds((prev) => prev.filter((id) => id !== athleteId));
    } else {
      const { error } = await supabase.from("user_favorite_athletes").insert({ user_id: user.id, athlete_id: athleteId });
      if (error && error.code !== "23505") { alert(error.message || "Não foi possível salvar o favorito."); return; }
      setFavoriteAthleteIds((prev) => prev.includes(athleteId) ? prev : [...prev, athleteId]);
    }
  }`,
'favoritos estados');

// ---------- Pesquisa + favoritos primeiro no Novo Scout ----------
const primaryRe=/  const filteredPrimaryAthletes = availableAthletes\.filter\(\(item\) => \{[\s\S]*?\n  \}\);/;
if(!primaryRe.test(src)) throw new Error('v25b filtro vermelho não encontrado');
src=src.replace(primaryRe,`  const filteredPrimaryAthletes = availableAthletes.filter((item) => {
    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : athleteClassFilter;
    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : athleteGenderFilter;
    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;
    const genderOk = activeGender === "Todos" || item.gender === activeGender;
    const nameOk = !athleteNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").includes(athleteNameSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => {
    const favoriteOrder = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));
    return favoriteOrder || a.name.localeCompare(b.name,"pt-BR");
  });`);

const opponentRe=/  const filteredOpponentAthletes = availableAthletes\.filter\(\(item\) => \{[\s\S]*?\n  \}\);/;
if(!opponentRe.test(src)) throw new Error('v25b filtro azul não encontrado');
src=src.replace(opponentRe,`  const filteredOpponentAthletes = availableAthletes.filter((item) => {
    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : opponentClassFilter;
    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : opponentGenderFilter;
    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;
    const genderOk = activeGender === "Todos" || item.gender === activeGender;
    const nameOk = !opponentNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").includes(opponentNameSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => {
    const favoriteOrder = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));
    return favoriteOrder || a.name.localeCompare(b.name,"pt-BR");
  });`);

// Insere pesquisa diretamente junto aos selects, sem depender do texto do label.
if(!src.includes('value={athleteNameSearch}')){
  src=src.replace(/(<select\s+value=\{selectedAthleteId\})/, '<input value={athleteNameSearch} onChange={(e) => setAthleteNameSearch(e.target.value)} placeholder="🔎 Digite o nome do atleta" style={{...styles.input,marginBottom:7}} />\n                    $1');
}
if(!src.includes('value={opponentNameSearch}')){
  src=src.replace(/(<select\s+value=\{selectedOpponentId\})/, '<input value={opponentNameSearch} onChange={(e) => setOpponentNameSearch(e.target.value)} placeholder="🔎 Digite o nome do atleta" style={{...styles.input,marginBottom:7}} />\n                    $1');
}

// Marca favoritos nas opções.
src=src.replaceAll('{filteredPrimaryAthletes.map((item) => (\n                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>\n                      ))}', '{filteredPrimaryAthletes.map((item) => (\n                        <option key={item.id} value={item.id}>{favoriteAthleteIds.includes(item.id) ? "★ " : ""}{item.name} · {item.athleteClass}</option>\n                      ))}');
src=src.replaceAll('{eligibleOpponents.map((item) => (\n                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>\n                      ))}', '{eligibleOpponents.map((item) => (\n                        <option key={item.id} value={item.id}>{favoriteAthleteIds.includes(item.id) ? "★ " : ""}{item.name} · {item.athleteClass}</option>\n                      ))}');

// Botão estrela logo após cada select.
if(!src.includes('☆ Favoritar atleta vermelho')){
  src=src.replace(/(<select\s+value=\{selectedAthleteId\}[\s\S]*?<\/select>)/, `$1\n                    <button type="button" disabled={!selectedAthleteId} onClick={() => toggleFavoriteAthlete(selectedAthleteId)} style={{...styles.button,background:selectedAthleteId && favoriteAthleteIds.includes(selectedAthleteId)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:selectedAthleteId?1:.55}}>{selectedAthleteId && favoriteAthleteIds.includes(selectedAthleteId) ? "★ Favorito" : "☆ Favoritar atleta vermelho"}</button>`);
}
if(!src.includes('☆ Favoritar atleta azul')){
  src=src.replace(/(<select\s+value=\{selectedOpponentId\}[\s\S]*?<\/select>)/, `$1\n                    <button type="button" disabled={!selectedOpponentId} onClick={() => toggleFavoriteAthlete(selectedOpponentId)} style={{...styles.button,background:selectedOpponentId && favoriteAthleteIds.includes(selectedOpponentId)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:selectedOpponentId?1:.55}}>{selectedOpponentId && favoriteAthleteIds.includes(selectedOpponentId) ? "★ Favorito" : "☆ Favoritar atleta azul"}</button>`);
}

// Padroniza os círculos vermelho/azul em 12px nos títulos existentes.
src=src.replace('>🔴 Atleta Vermelho</div>', '><span style={{width:12,height:12,borderRadius:"50%",background:"#dc2626",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Vermelho</div>');
src=src.replace('>🔵 Atleta Azul</div>', '><span style={{width:12,height:12,borderRadius:"50%",background:"#2563eb",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Azul</div>');

// ---------- Nível Nacional / Internacional ----------
mustReplace('  const [competitionPhase, setCompetitionPhase] = useState("");','  const [competitionPhase, setCompetitionPhase] = useState("");\n  const [competitionLevel, setCompetitionLevel] = useState("Nacional");','nível estado');
const phaseNeedle='<input value={competitionPhase} onChange={(e) => setCompetitionPhase(e.target.value)} placeholder="Ex.: Fase classificatória, semifinal, final" style={styles.input} />';
if(!src.includes('label="Nível do campeonato"')){
  mustReplace(phaseNeedle, phaseNeedle+'\n                      </Field>\n                    </div>\n                    <div style={{ gridColumn: "1 / -1" }}>\n                      <Field label="Nível do campeonato">\n                        <select value={competitionLevel} onChange={(e) => setCompetitionLevel(e.target.value)} style={styles.input}><option>Nacional</option><option>Internacional</option></select>\n                      </Field>\n                    </div>\n                    <div style={{ display: "none" }}>\n                      <Field label="_continua">','nível campo');
  // corrige o fechamento extra criado pelo enxerto acima mantendo o JSX original balanceado
  src=src.replace('<div style={{ display: "none" }}>\n                      <Field label="_continua">\n                      </Field>\n                    </div>','');
}

// Persistência no histórico novo.
mustReplace('          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",','          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",\n          competitionLevel: sessionKind === "Campeonato" ? competitionLevel : "",\n          athleteGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedAthleteId)?.gender || "") : "",\n          opponentGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedOpponentId)?.gender || "") : "",','persistência nível/gênero');
src=src.replaceAll('setCompetitionPhase(""); setView("new");','setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new");');
src=src.replaceAll('    setCompetitionPhase("");\n','    setCompetitionPhase("");\n    setCompetitionLevel("Nacional");\n');

// ---------- Histórico ----------
mustReplace('function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [] }) {','function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [], favoriteAthleteIds = [], onToggleFavorite }) {','history props');
mustReplace('  const [selectedSessionId, setSelectedSessionId] = useState("");',`  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [historyAthleteSearch, setHistoryAthleteSearch] = useState("");
  const [historyClassFilter, setHistoryClassFilter] = useState("Todos");
  const [historyGenderFilter, setHistoryGenderFilter] = useState("Todos");
  const [historyLevelFilter, setHistoryLevelFilter] = useState("Todos");
  const historyAthletes = useMemo(() => athletes.filter((a) => {
    const classOk = historyClassFilter === "Todos" || a.athleteClass === historyClassFilter;
    const genderOk = historyGenderFilter === "Todos" || a.gender === historyGenderFilter;
    const nameOk = !historyAthleteSearch.trim() || a.name.toLocaleLowerCase("pt-BR").includes(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => {
    const favoriteOrder = Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id));
    return favoriteOrder || a.name.localeCompare(b.name,"pt-BR");
  }), [athletes, historyClassFilter, historyGenderFilter, historyAthleteSearch, favoriteAthleteIds]);`,'history filtros estados');

mustReplace('    const selectedColor = colorForSelectedAthlete(s);\n    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;',`    const selectedColor = colorForSelectedAthlete(s);
    const role = athleteRole(s);
    const roleClass = role === "adversario" ? s.opponentClass : s.athleteClass;
    const roleGender = role === "adversario" ? (s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender || "") : (s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender || "");
    const classOk = historyClassFilter === "Todos" || (athleteFilter === "Todos" ? s.athleteClass === historyClassFilter || s.opponentClass === historyClassFilter : roleClass === historyClassFilter);
    const genderOk = historyGenderFilter === "Todos" || (athleteFilter === "Todos" ? (s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender) === historyGenderFilter || (s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender) === historyGenderFilter : roleGender === historyGenderFilter);
    const levelOk = historyLevelFilter === "Todos" || (s.sessionKind === "Campeonato" && s.competitionLevel === historyLevelFilter);
    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && classOk && genderOk && levelOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;`,'history filtro combinado');

const historyAthleteField='<Field label="Atleta"><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>';
const historyAthleteFieldNew='<Field label="🔎 Atleta"><input value={historyAthleteSearch} onChange={e=>setHistoryAthleteSearch(e.target.value)} placeholder="Digite o nome" style={{...styles.input,marginBottom:7}}/><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{historyAthletes.map(a=><option key={a.id} value={a.id}>{favoriteAthleteIds.includes(a.id)?"★ ":""}{a.name}</option>)}</select><button type="button" disabled={athleteFilter==="Todos"} onClick={()=>athleteFilter!=="Todos"&&onToggleFavorite?.(athleteFilter)} style={{...styles.button,background:athleteFilter!=="Todos"&&favoriteAthleteIds.includes(athleteFilter)?"#ca8a04":"#64748b",padding:"8px 11px",marginTop:7,width:"100%",opacity:athleteFilter!=="Todos"?1:.55}}>{athleteFilter!=="Todos"&&favoriteAthleteIds.includes(athleteFilter)?"★ Favorito":"☆ Favoritar atleta"}</button></Field>\n        <Field label="Classe"><select value={historyClassFilter} onChange={e=>{setHistoryClassFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></Field>\n        <Field label="Gênero"><select value={historyGenderFilter} onChange={e=>{setHistoryGenderFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></Field>\n        <Field label="Nível"><select value={historyLevelFilter} onChange={e=>setHistoryLevelFilter(e.target.value)} style={styles.input}><option>Todos</option><option>Nacional</option><option>Internacional</option></select></Field>';
mustReplace(historyAthleteField,historyAthleteFieldNew,'history ui');

mustReplace('              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}','              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}\n              favoriteAthleteIds={favoriteAthleteIds}\n              onToggleFavorite={toggleFavoriteAthlete}','history props pass');

fs.writeFileSync(file,src,'utf8');
console.log('favorites-search-history-v25b aplicado');
