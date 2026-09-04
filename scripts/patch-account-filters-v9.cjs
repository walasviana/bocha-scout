const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: account-filters-v9')) {
  console.log('account-filters-v9 já aplicado');
  process.exit(0);
}

function rep(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`account-filters-v9: trecho não encontrado: ${label}`);
  src = src.replace(from, to);
}

function rx(pattern, to, label) {
  if (!pattern.test(src)) throw new Error(`account-filters-v9: padrão não encontrado: ${label}`);
  src = src.replace(pattern, to);
}

// Marca patch
rep(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: account-filters-v9',
  'marker'
);

// Gêneros disponíveis
rep(
  'const COLORS = ["Vermelho", "Azul"];',
  'const COLORS = ["Vermelho", "Azul"];\nconst GENDERS = ["Masculino", "Feminino"];',
  'genders const'
);

// Banco: passa a carregar gender
src = src.replace('.select("id,name,class,country,uf")', '.select("id,name,class,country,uf,gender")');
rep(
  '        uf: item.uf,\n        observations:',
  '        uf: item.uf,\n        gender: item.gender || "",\n        observations:',
  'map gender'
);

// Estado do usuário atual e filtros do Novo Scout
rep(
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");',
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [currentUserId, setCurrentUserId] = useState("");\n  const [redClassFilter, setRedClassFilter] = useState("");\n  const [blueClassFilter, setBlueClassFilter] = useState("");\n  const [redGenderFilter, setRedGenderFilter] = useState("");\n  const [blueGenderFilter, setBlueGenderFilter] = useState("");',
  'new states'
);

// Obtém a conta logada e atribui registros legados apenas a ela.
rep(
  '  useEffect(() => {\n    safeSave(STORAGE_KEYS.sessions, sessions);\n  }, [sessions]);',
  `  useEffect(() => {\n    safeSave(STORAGE_KEYS.sessions, sessions);\n  }, [sessions]);\n\n  useEffect(() => {\n    let active = true;\n    supabase.auth.getUser().then(({ data }) => {\n      if (!active) return;\n      setCurrentUserId(data?.user?.id || "");\n    });\n    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {\n      if (active) setCurrentUserId(session?.user?.id || "");\n    });\n    return () => { active = false; listener?.subscription?.unsubscribe?.(); };\n  }, []);\n\n  useEffect(() => {\n    if (!currentUserId) return;\n    setSessions((prev) => prev.map((s) => s.ownerUserId ? s : { ...s, ownerUserId: currentUserId }));\n  }, [currentUserId]);\n\n  const accountSessions = useMemo(\n    () => currentUserId ? sessions.filter((s) => s.ownerUserId === currentUserId) : [],\n    [sessions, currentUserId]\n  );`,
  'account scoped sessions'
);

// Cadastro de atleta local: gênero
rep(
  '  const [observations, setObservations] = useState("");',
  '  const [observations, setObservations] = useState("");\n  const [athleteGender, setAthleteGender] = useState("");',
  'athlete screen gender state'
);
rep(
  '      athleteClass,\n      observations:',
  '      athleteClass,\n      gender: athleteGender,\n      observations:',
  'save athlete gender'
);
rep(
  '    setAthleteClass("");\n    setObservations("");',
  '    setAthleteClass("");\n    setAthleteGender("");\n    setObservations("");',
  'reset athlete gender'
);
rep(
  `            <Field label="Observações">`,
  `            <Field label="Gênero">\n              <select value={athleteGender} onChange={(e) => setAthleteGender(e.target.value)} style={styles.input}>\n                <option value="">Não informado</option>\n                {GENDERS.map((g) => <option key={g}>{g}</option>)}\n              </select>\n            </Field>\n            <Field label="Observações">`,
  'athlete gender UI'
);
src = src.replace('{a.athleteClass} · {athleteSessions.length} partidas', '{a.athleteClass}{a.gender ? ` · ${a.gender}` : ""} · {athleteSessions.length} partidas');

// Ao escolher atletas, sincroniza classe/gênero quando já existem no cadastro.
rep(
  '    setAthlete(found?.name || "");\n    setAthleteClass(found?.athleteClass || "");',
  '    setAthlete(found?.name || "");\n    setAthleteClass(found?.athleteClass || "");\n    if (found?.athleteClass) setRedClassFilter(found.athleteClass);\n    if (found?.gender) setRedGenderFilter(found.gender);',
  'red selection metadata'
);
rep(
  '    setOpponent(found?.name || "");\n    setOpponentClass(found?.athleteClass || "");',
  '    setOpponent(found?.name || "");\n    setOpponentClass(found?.athleteClass || "");\n    if (found?.athleteClass) setBlueClassFilter(found.athleteClass);\n    if (found?.gender) setBlueGenderFilter(found.gender);',
  'blue selection metadata'
);

// Disponibilidade de atletas com filtros independentes por lado.
rx(
  /  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";[\s\S]*?  const eligibleOpponents = availableAthletes\.filter\(\(item\) => item\.id !== selectedAthleteId\);/,
  `  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";\n  const availableAthletes = athletes.filter((item) => {\n    if (isInternationalCompetition) return true;\n    const country = String(item.country || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();\n    return country === "brasil";\n  });\n\n  const redCandidates = availableAthletes.filter((item) => {\n    const classOk = !redClassFilter || item.athleteClass === redClassFilter;\n    const genderOk = !redGenderFilter || !item.gender || item.gender === redGenderFilter;\n    return classOk && genderOk;\n  });\n\n  const blueCandidates = availableAthletes.filter((item) => {\n    if (item.id === selectedAthleteId) return false;\n    const requiredClass = sessionKind === "Campeonato" ? redClassFilter : blueClassFilter;\n    const requiredGender = sessionKind === "Campeonato" ? redGenderFilter : blueGenderFilter;\n    const classOk = !requiredClass || item.athleteClass === requiredClass;\n    const genderOk = !requiredGender || !item.gender || item.gender === requiredGender;\n    return classOk && genderOk;\n  });\n\n  const eligibleOpponents = blueCandidates;`,
  'candidate filters'
);

// Novo Scout: filtros antes dos atletas.
const redFieldNeedle = '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>';
const filtersUi = `                {gameType === "Individual" && (<>\n                  <Field label="Classe · Vermelho">\n                    <select value={redClassFilter} onChange={(e) => { const v=e.target.value; setRedClassFilter(v); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); if (sessionKind === "Campeonato") { setBlueClassFilter(v); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); } }} style={styles.input}>\n                      <option value="">Todas as classes</option>\n                      {CLASSES.map((c) => <option key={c}>{c}</option>)}\n                    </select>\n                  </Field>\n                  <Field label="Gênero · Vermelho">\n                    <select value={redGenderFilter} onChange={(e) => { const v=e.target.value; setRedGenderFilter(v); setSelectedAthleteId(""); setAthlete(""); if (sessionKind === "Campeonato") { setBlueGenderFilter(v); setSelectedOpponentId(""); setOpponent(""); } }} style={styles.input}>\n                      <option value="">Todos os gêneros</option>\n                      {GENDERS.map((g) => <option key={g}>{g}</option>)}\n                    </select>\n                  </Field>\n                  <Field label="Classe · Azul">\n                    <select value={sessionKind === "Campeonato" ? redClassFilter : blueClassFilter} disabled={sessionKind === "Campeonato"} onChange={(e) => { setBlueClassFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>\n                      <option value="">Todas as classes</option>\n                      {CLASSES.map((c) => <option key={c}>{c}</option>)}\n                    </select>\n                  </Field>\n                  <Field label="Gênero · Azul">\n                    <select value={sessionKind === "Campeonato" ? redGenderFilter : blueGenderFilter} disabled={sessionKind === "Campeonato"} onChange={(e) => { setBlueGenderFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); }} style={styles.input}>\n                      <option value="">Todos os gêneros</option>\n                      {GENDERS.map((g) => <option key={g}>{g}</option>)}\n                    </select>\n                  </Field>\n                </>)}\n\n                ${redFieldNeedle}`;
rep(redFieldNeedle, filtersUi, 'new scout filters UI');
src = src.replace('{availableAthletes.map((item) => (', '{redCandidates.map((item) => (');

// Mostra gênero nas opções.
src = src.replace('{item.name} · {item.athleteClass}{item.country ? " · " + item.country : ""}{item.uf ? "/" + item.uf : ""}</option>', '{item.name} · {item.athleteClass}{item.gender ? " · " + item.gender : ""}{item.country ? " · " + item.country : ""}{item.uf ? "/" + item.uf : ""}</option>');

// Regra: campeonato Individual exige mesma classe e mesmo gênero; treino permite diferenças.
rep(
  '    if (gameType === "Individual" && selectedAthleteId === selectedOpponentId) {\n      alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");\n      return;\n    }',
  `    if (gameType === "Individual" && selectedAthleteId === selectedOpponentId) {\n      alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");\n      return;\n    }\n\n    if (gameType === "Individual" && (!redGenderFilter || !blueGenderFilter)) {\n      alert("Selecione o gênero dos dois atletas.");\n      return;\n    }\n\n    if (gameType === "Individual" && sessionKind === "Campeonato") {\n      if (athleteClass !== opponentClass) {\n        alert("Em campeonato, os dois atletas precisam ser da mesma classe. Classes diferentes são permitidas apenas em treino.");\n        return;\n      }\n      if (redGenderFilter !== blueGenderFilter) {\n        alert("Em campeonato, os dois atletas precisam ser do mesmo gênero. Gêneros diferentes são permitidos apenas em treino.");\n        return;\n      }\n    }`,
  'competition restrictions'
);

// Salva dono e gêneros no registro da partida.
rep(
  '          id,\n          date: sessionDate,',
  '          id,\n          ownerUserId: currentUserId || null,\n          date: sessionDate,',
  'owner save'
);
rep(
  '          opponentClass: gameType === "Individual" ? opponentClass : "",\n          athleteColor,',
  '          opponentClass: gameType === "Individual" ? opponentClass : "",\n          athleteGender: gameType === "Individual" ? redGenderFilter : "",\n          opponentGender: gameType === "Individual" ? blueGenderFilter : "",\n          athleteColor,',
  'gender save session'
);

// Reset dos filtros na nova partida.
rep(
  '    setOpponentClass("");\n    setGender("");',
  '    setOpponentClass("");\n    setGender("");\n    setRedClassFilter("");\n    setBlueClassFilter("");\n    setRedGenderFilter("");\n    setBlueGenderFilter("");',
  'reset filters'
);

// Dashboard: só registros da conta e filtros de classe/gênero.
rep(
  'function DashboardScreen({ sessions, athletes, onNewScout, onHistory }) {\n  const totalPlays =',
  'function DashboardScreen({ sessions, athletes, onNewScout, onHistory }) {\n  const [classFilter, setClassFilter] = useState("Todos");\n  const [genderFilter, setGenderFilter] = useState("Todos");\n  const filteredSessions = sessions.filter((s) => (classFilter === "Todos" || s.athleteClass === classFilter || s.opponentClass === classFilter) && (genderFilter === "Todos" || s.athleteGender === genderFilter || s.opponentGender === genderFilter));\n  sessions = filteredSessions;\n  const totalPlays =',
  'dashboard filters state'
);
rep(
  '      <div style={styles.card}>\n        <h2>Visão geral</h2>',
  `      <div style={styles.card}>\n        <h2>Visão geral</h2>\n        <p style={{ color: "#64748b", marginTop: -4 }}>Somente registros feitos por esta conta.</p>\n        <div style={{ ...styles.grid, marginBottom: 14 }}>\n          <Field label="Classe">\n            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.input}>\n              <option>Todos</option>\n              {CLASSES.map((c) => <option key={c}>{c}</option>)}\n            </select>\n          </Field>\n          <Field label="Gênero">\n            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={styles.input}>\n              <option>Todos</option>\n              {GENDERS.map((g) => <option key={g}>{g}</option>)}\n            </select>\n          </Field>\n        </div>`,
  'dashboard filter UI'
);

// Usa somente sessões da conta tanto no início quanto no histórico/atletas.
src = src.replace('sessions={sessions}\n              athletes={athletes}\n              onNewScout=', 'sessions={accountSessions}\n              athletes={athletes}\n              onNewScout=');
src = src.replace('sessions={sessions}\n              athletes={athletes}\n              onBack={() => setView("dashboard")}', 'sessions={accountSessions}\n              athletes={athletes}\n              onBack={() => setView("dashboard")}');
// AthletesScreen também deve contar só partidas da conta.
src = src.replace('athletes={athletes}\n              sessions={sessions}\n              onAdd=', 'athletes={athletes}\n              sessions={accountSessions}\n              onAdd=');

// Verificações mínimas.
if (!src.includes('ownerUserId: currentUserId || null')) throw new Error('account-filters-v9: owner não salvo');
if (!src.includes('Classe · Vermelho') || !src.includes('Gênero · Azul')) throw new Error('account-filters-v9: filtros do Novo Scout ausentes');
if (!src.includes('Somente registros feitos por esta conta.')) throw new Error('account-filters-v9: dashboard por conta ausente');
if (!src.includes('Em campeonato, os dois atletas precisam ser da mesma classe')) throw new Error('account-filters-v9: regra de campeonato ausente');

fs.writeFileSync(file, src, 'utf8');
console.log('account-filters-v9 aplicado');
