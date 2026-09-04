const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: dashboard-training-v21')) process.exit(0);

function replaceOnce(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`v21 trecho não encontrado: ${label}`);
  src = src.replace(from, to);
}

if (src.includes('// PATCH: ui-review-v20')) {
  src = src.replace('// PATCH: ui-review-v20', '// PATCH: ui-review-v20\n// PATCH: dashboard-training-v21');
} else if (src.includes('import { supabase } from "../lib/supabase";')) {
  src = src.replace('import { supabase } from "../lib/supabase";', 'import { supabase } from "../lib/supabase";\n// PATCH: dashboard-training-v21');
} else {
  src = '// PATCH: dashboard-training-v21\n' + src;
}

// A escolha Treino/Campeonato fica no painel inicial; não repete no menu principal.
src = src.replace('    ["new", "Novo Scout"],\n', '');

// Dashboard novo: mantém filtros existentes e mostra os cinco indicadores combinados.
const dashboardStart = src.indexOf('function DashboardScreen(');
const athletesStart = src.indexOf('function AthletesScreen(', dashboardStart);
if (dashboardStart < 0 || athletesStart < 0) throw new Error('v21 DashboardScreen não encontrado');

const dashboard = `function DashboardScreen({ sessions, athletes, onNewTraining, onNewCompetition, onHistory }) {
  const [classFilter, setClassFilter] = useState("Todos");
  const [genderFilter, setGenderFilter] = useState("Todos");

  const visibleSessions = sessions.filter((s) => {
    const classOk = classFilter === "Todos" || s.athleteClass === classFilter || s.opponentClass === classFilter;
    const genderOk = genderFilter === "Todos" || s.athleteGender === genderFilter || s.opponentGender === genderFilter;
    return classOk && genderOk;
  });

  const performanceRows = visibleSessions.map((s) => ({
    session: s,
    efficiency: Number(s.stats?.efficiency ?? calcStats(getAthletePlays(s)).efficiency ?? 0),
  }));
  const best = [...performanceRows].sort((a, b) => b.efficiency - a.efficiency)[0];
  const worst = [...performanceRows].sort((a, b) => a.efficiency - b.efficiency)[0];

  const classCount = {};
  visibleSessions.forEach((s) => {
    if (!s.athleteClass) return;
    classCount[s.athleteClass] = (classCount[s.athleteClass] || 0) + 1;
  });
  const mostAnalyzedClass = Object.entries(classCount).sort((a, b) => b[1] - a[1])[0];
  const last = [...visibleSessions].sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))[0];

  return (
    <>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 4 }}>Visão geral</h2>
        <p style={{ ...styles.helpText, marginTop: 0 }}>Escolha o tipo de scout para iniciar. A seleção não será pedida novamente durante o cadastro da partida.</p>

        <div style={{ ...styles.grid, marginBottom: 14 }}>
          <Field label="Classe">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.input}>
              <option>Todos</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Gênero">
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={styles.input}>
              <option>Todos</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div style={styles.miniStats}>
          <MiniStat label="Total de scouts" value={visibleSessions.length} />
          <MiniStat label="Melhor desempenho" value={best ? best.efficiency.toFixed(1) + "%" : "—"} />
          <MiniStat label="Pior desempenho" value={worst ? worst.efficiency.toFixed(1) + "%" : "—"} />
          <MiniStat label="Classe mais analisada" value={mostAnalyzedClass ? mostAnalyzedClass[0] + " · " + mostAnalyzedClass[1] : "—"} />
          <MiniStat label="Último scout" value={last ? formatDateBR(last.date) : "—"} />
        </div>

        {(best || worst || last) && (
          <div style={{ ...styles.grid, marginTop: 14 }}>
            <InfoBox title="Melhor" value={best ? best.session.athlete + " · " + best.efficiency.toFixed(1) + "%" : "—"} />
            <InfoBox title="Ponto de atenção" value={worst ? worst.session.athlete + " · " + worst.efficiency.toFixed(1) + "%" : "—"} />
            <InfoBox title="Última análise" value={last ? last.athlete + " × " + last.opponent : "—"} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 16 }}>
          <button onClick={onNewTraining} style={{ ...styles.button, ...styles.green }}>Novo Scout · Treino</button>
          <button onClick={onNewCompetition} style={{ ...styles.button, background: "#2563eb" }}>Novo Scout · Campeonato</button>
          <button onClick={onHistory} style={{ ...styles.button, background: "#475569" }}>Ver Histórico</button>
        </div>
      </div>
    </>
  );
}

`;
src = src.slice(0, dashboardStart) + dashboard + src.slice(athletesStart);

replaceOnce(
  '  const [competitionName, setCompetitionName] = useState("");',
  '  const [competitionName, setCompetitionName] = useState("");\n  const [competitionPhase, setCompetitionPhase] = useState("");',
  'estado fase campeonato'
);

replaceOnce(
  '  const [newScoutClassFilter, setNewScoutClassFilter] = useState("Todos");\n  const [newScoutGenderFilter, setNewScoutGenderFilter] = useState("Todos");',
  '  const [athleteClassFilter, setAthleteClassFilter] = useState("Todos");\n  const [athleteGenderFilter, setAthleteGenderFilter] = useState("Todos");\n  const [opponentClassFilter, setOpponentClassFilter] = useState("Todos");\n  const [opponentGenderFilter, setOpponentGenderFilter] = useState("Todos");',
  'estados filtros independentes'
);

const oldFilterLogic = `  const filteredNewScoutAthletes = availableAthletes.filter((item) => {
    const classOk = newScoutClassFilter === "Todos" || item.athleteClass === newScoutClassFilter;
    const genderOk = newScoutGenderFilter === "Todos" || item.gender === newScoutGenderFilter;
    return classOk && genderOk;
  });
  const selectedAthleteRecord = athletes.find((item) => item.id === selectedAthleteId);
  const eligibleOpponents = filteredNewScoutAthletes.filter((item) => {
    if (item.id === selectedAthleteId) return false;
    if (sessionKind === "Treino") return true;
    if (!selectedAthleteRecord) return true;
    return item.athleteClass === selectedAthleteRecord.athleteClass && item.gender === selectedAthleteRecord.gender;
  });`;

const newFilterLogic = `  const filteredPrimaryAthletes = availableAthletes.filter((item) => {
    const classOk = athleteClassFilter === "Todos" || item.athleteClass === athleteClassFilter;
    const genderOk = athleteGenderFilter === "Todos" || item.gender === athleteGenderFilter;
    return classOk && genderOk;
  });
  const selectedAthleteRecord = athletes.find((item) => item.id === selectedAthleteId);
  const filteredOpponentAthletes = availableAthletes.filter((item) => {
    const classOk = opponentClassFilter === "Todos" || item.athleteClass === opponentClassFilter;
    const genderOk = opponentGenderFilter === "Todos" || item.gender === opponentGenderFilter;
    return classOk && genderOk;
  });
  const eligibleOpponents = filteredOpponentAthletes.filter((item) => {
    if (item.id === selectedAthleteId) return false;
    if (sessionKind === "Treino") return true;
    if (!selectedAthleteRecord) return true;
    return item.athleteClass === selectedAthleteRecord.athleteClass && item.gender === selectedAthleteRecord.gender;
  });`;
replaceOnce(oldFilterLogic, newFilterLogic, 'lógica filtros independentes');

replaceOnce(
  '  function startGame() {\n    if (!athlete.trim()) {',
  '  function startGame() {\n    if (sessionKind === "Campeonato" && !competitionName.trim()) {\n      alert("Informe o nome do campeonato.");\n      return;\n    }\n    if (sessionKind === "Campeonato" && !competitionPhase.trim()) {\n      alert("Informe a fase do campeonato.");\n      return;\n    }\n    if (!athlete.trim()) {',
  'validação campeonato'
);

src = src.replace('    setCompetitionName("");\n', '    setCompetitionName("");\n    setCompetitionPhase("");\n');
src = src.replace('    setNewScoutClassFilter("Todos");\n    setNewScoutGenderFilter("Todos");', '    setAthleteClassFilter("Todos");\n    setAthleteGenderFilter("Todos");\n    setOpponentClassFilter("Todos");\n    setOpponentGenderFilter("Todos");');

replaceOnce(
  '          competitionName: sessionKind === "Campeonato" ? competitionName.trim() : "",',
  '          competitionName: sessionKind === "Campeonato" ? competitionName.trim() : "",\n          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",',
  'persistência fase'
);

src = src.replace(
  '    if (sessionKind === "Campeonato" && competitionName.trim()) {\n      line(`Campeonato: ${competitionName.trim()}`);\n    }',
  '    if (sessionKind === "Campeonato" && competitionName.trim()) {\n      line(`Campeonato: ${competitionName.trim()}`);\n      if (competitionPhase.trim()) line(`Fase: ${competitionPhase.trim()}`);\n    }'
);
src = src.replace(
  '    if(item.competitionName) line(`Campeonato: ${item.competitionName}`);',
  '    if(item.competitionName) line(`Campeonato: ${item.competitionName}`);\n    if(item.competitionPhase) line(`Fase: ${item.competitionPhase}`);'
);
src = src.replace(
  '{item.competitionName ? ` · ${item.competitionName}` : ""}',
  '{item.competitionName ? ` · ${item.competitionName}` : ""}{item.competitionPhase ? ` · ${item.competitionPhase}` : ""}'
);

replaceOnce(
  '              onNewScout={() => setView("new")}\n              onHistory={() => setView("history")}',
  '              onNewTraining={() => { setSessionKind("Treino"); setCompetitionName(""); setCompetitionPhase(""); setView("new"); }}\n              onNewCompetition={() => { setSessionKind("Campeonato"); setCompetitionName(""); setCompetitionPhase(""); setView("new"); }}\n              onHistory={() => setView("history")}',
  'callbacks dashboard'
);

const sessionField = `                <Field label="Sessão">
                  <select value={sessionKind} onChange={(e) => setSessionKind(e.target.value)} style={styles.input}>
                    <option>Treino</option>
                    <option>Campeonato</option>
                  </select>
                </Field>

`;
src = src.replace(sessionField, '');
src = src.replace('<h2>Novo Scout</h2>', '<h2>Novo Scout · {sessionKind}</h2>');

const oldCompetitionField = `                {sessionKind === "Campeonato" && (
                  <Field label="Nome do campeonato (opcional)">
                    <input value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} placeholder="Ex.: Brasileiro de Jovens" style={styles.input} />
                  </Field>
                )}`;
const newCompetitionField = `                {sessionKind === "Campeonato" && (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Nome do campeonato">
                        <input value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} placeholder="Ex.: Brasileiro de Jovens" style={styles.input} />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Fase do campeonato">
                        <input value={competitionPhase} onChange={(e) => setCompetitionPhase(e.target.value)} placeholder="Ex.: Fase classificatória, semifinal, final" style={styles.input} />
                      </Field>
                    </div>
                  </>
                )}`;
replaceOnce(oldCompetitionField, newCompetitionField, 'campos campeonato');

const filterBlockStart = src.indexOf('                {gameType === "Individual" && (\n                  <>\n                    <Field label="Filtrar por classe">');
const individualBranchStart = src.indexOf('                {gameType === "Individual" ? (', filterBlockStart + 1);
if (filterBlockStart < 0 || individualBranchStart < 0) throw new Error('v21 bloco de filtros v11 não encontrado');
const filterBlock = `                {gameType === "Individual" && sessionKind === "Treino" && (
                  <>
                    <div style={{ gridColumn: "1 / -1", fontWeight: 900, color: "#334155", marginTop: 4 }}>Filtros do atleta analisado</div>
                    <Field label="Classe do atleta">
                      <select value={athleteClassFilter} onChange={(e) => { setAthleteClassFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Gênero do atleta">
                      <select value={athleteGenderFilter} onChange={(e) => { setAthleteGenderFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

`;
src = src.slice(0, filterBlockStart) + filterBlock + src.slice(individualBranchStart);

src = src.replace('{filteredNewScoutAthletes.map((item) => (', '{filteredPrimaryAthletes.map((item) => (');

const opponentField = '                {gameType === "Individual" ? (\n                  <Field label="Adversário cadastrado">';
const opponentFilters = `                {gameType === "Individual" && sessionKind === "Treino" && (
                  <>
                    <div style={{ gridColumn: "1 / -1", fontWeight: 900, color: "#334155", marginTop: 4 }}>Filtros do adversário</div>
                    <Field label="Classe do adversário">
                      <select value={opponentClassFilter} onChange={(e) => { setOpponentClassFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Gênero do adversário">
                      <select value={opponentGenderFilter} onChange={(e) => { setOpponentGenderFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

${opponentField}`;
replaceOnce(opponentField, opponentFilters, 'filtros adversário');

fs.writeFileSync(file, src, 'utf8');
console.log('dashboard-training-v21 aplicado');
