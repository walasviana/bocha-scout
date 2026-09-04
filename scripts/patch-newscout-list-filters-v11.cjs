const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: newscout-list-filters-v11')) process.exit(0);

function rep(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`v11: ${label}`);
  src = src.replace(from, to);
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

const eligibleNeedle = '  const eligibleOpponents = availableAthletes.filter((item) => item.id !== selectedAthleteId);';
const eligibleReplacement = `  const filteredNewScoutAthletes = availableAthletes.filter((item) => {\n    const classOk = newScoutClassFilter === "Todos" || item.athleteClass === newScoutClassFilter;\n    const genderOk = newScoutGenderFilter === "Todos" || item.gender === newScoutGenderFilter;\n    return classOk && genderOk;\n  });\n\n  const eligibleOpponents = filteredNewScoutAthletes.filter((item) => item.id !== selectedAthleteId);`;
rep(eligibleNeedle, eligibleReplacement, 'filtered athlete list');

const newViewStart = src.indexOf('{view === "new" && (');
if (newViewStart < 0) throw new Error('v11: tela Novo Scout não encontrada');
const head = src.slice(0, newViewStart);
let tail = src.slice(newViewStart);

const redField = '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>';
const filterUi = `                <Field label="Filtrar por classe">\n                  <select value={newScoutClassFilter} onChange={(e) => { setNewScoutClassFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>\n                    <option value="Todos">Todas as classes</option>\n                    {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}\n                  </select>\n                </Field>\n\n                <Field label="Filtrar por gênero">\n                  <select value={newScoutGenderFilter} onChange={(e) => { setNewScoutGenderFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>\n                    <option value="Todos">Todos os gêneros</option>\n                    {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}\n                  </select>\n                </Field>\n\n                ${redField}`;
if (!tail.includes(redField)) throw new Error('v11: campo Atleta Vermelho não encontrado');
tail = tail.replace(redField, filterUi);
tail = tail.replace('{availableAthletes.map((item) => (', '{filteredNewScoutAthletes.map((item) => (');

src = head + tail;

rep(
  '    setSessionKind("Treino");\n    setCompetitionScope("Nacional");',
  '    setSessionKind("Treino");\n    setCompetitionScope("Nacional");\n    setNewScoutClassFilter("Todos");\n    setNewScoutGenderFilter("Todos");',
  'reset filters'
);

if (!src.includes('Filtrar por classe') || !src.includes('Filtrar por gênero')) throw new Error('v11: filtros não aplicados');
if (!src.includes('filteredNewScoutAthletes.map')) throw new Error('v11: lista vermelha não filtrada');
if (!src.includes('eligibleOpponents = filteredNewScoutAthletes.filter')) throw new Error('v11: lista azul não filtrada');

fs.writeFileSync(file, src, 'utf8');
console.log('newscout-list-filters-v11 aplicado');
