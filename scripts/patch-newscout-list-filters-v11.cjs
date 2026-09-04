const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: newscout-list-filters-v11')) process.exit(0);

function rep(from, to, label) {
  if (src.includes(to)) return true;
  if (!src.includes(from)) {
    console.log('v11 aviso:', label);
    return false;
  }
  src = src.replace(from, to);
  return true;
}

rep(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: newscout-list-filters-v11',
  'marker'
);

rep(
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");',
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [newScoutClassFilter, setNewScoutClassFilter] = useState("Todos");\n  const [newScoutGenderFilter, setNewScoutGenderFilter] = useState("Todos");',
  'filter states'
);

rep(
  '  const eligibleOpponents = availableAthletes.filter((item) => item.id !== selectedAthleteId);',
  '  const filteredNewScoutAthletes = availableAthletes.filter((item) => {\n    const classOk = newScoutClassFilter === "Todos" || item.athleteClass === newScoutClassFilter;\n    const genderOk = newScoutGenderFilter === "Todos" || item.gender === newScoutGenderFilter;\n    return classOk && genderOk;\n  });\n\n  const eligibleOpponents = filteredNewScoutAthletes.filter((item) => item.id !== selectedAthleteId);',
  'filtered athlete list'
);

const newViewStart = src.indexOf('{view === "new" && (');
if (newViewStart >= 0) {
  const head = src.slice(0, newViewStart);
  let tail = src.slice(newViewStart);
  const redField = '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>';
  const filterUi = `                <Field label="Filtrar por classe">\n                  <select value={newScoutClassFilter} onChange={(e) => { setNewScoutClassFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>\n                    <option value="Todos">Todas as classes</option>\n                    {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}\n                  </select>\n                </Field>\n\n                <Field label="Filtrar por gênero">\n                  <select value={newScoutGenderFilter} onChange={(e) => { setNewScoutGenderFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>\n                    <option value="Todos">Todos os gêneros</option>\n                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}\n                  </select>\n                </Field>\n\n                ${redField}`;
  if (tail.includes(redField)) tail = tail.replace(redField, filterUi);
  else console.log('v11 aviso: campo Atleta Vermelho não encontrado');
  tail = tail.replace('{availableAthletes.map((item) => (', '{filteredNewScoutAthletes.map((item) => (');
  src = head + tail;
} else {
  console.log('v11 aviso: tela Novo Scout não encontrada');
}

rep(
  '    setSessionKind("Treino");\n    setCompetitionScope("Nacional");',
  '    setSessionKind("Treino");\n    setCompetitionScope("Nacional");\n    setNewScoutClassFilter("Todos");\n    setNewScoutGenderFilter("Todos");',
  'reset filters'
);

fs.writeFileSync(file, src, 'utf8');
console.log('newscout-list-filters-v11 finalizado', {
  filtros: src.includes('Filtrar por classe') && src.includes('Filtrar por gênero'),
  vermelhoFiltrado: src.includes('filteredNewScoutAthletes.map'),
  azulFiltrado: src.includes('eligibleOpponents = filteredNewScoutAthletes.filter')
});
