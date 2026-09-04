const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('// PATCH: dashboard-gender-v9b')) process.exit(0);
function rep(a,b,l){if(src.includes(b))return;if(!src.includes(a))throw new Error('v9b '+l);src=src.replace(a,b);}
rep('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: dashboard-gender-v9b','marker');
rep('const COLORS = ["Vermelho", "Azul"];','const COLORS = ["Vermelho", "Azul"];\nconst GENDERS = ["Masculino", "Feminino"];','genders');
src=src.replace('.select("id,name,class,country,uf")','.select("id,name,class,country,uf,gender")');
rep('        uf: item.uf,\n        observations:','        uf: item.uf,\n        gender: item.gender || "",\n        observations:','map gender');
rep('function DashboardScreen({ sessions, athletes, onNewScout, onHistory }) {\n  const totalPlays =','function DashboardScreen({ sessions, athletes, onNewScout, onHistory }) {\n  const [classFilter, setClassFilter] = useState("Todos");\n  const [genderFilter, setGenderFilter] = useState("Todos");\n  const visibleSessions = sessions.filter((s) => (classFilter === "Todos" || s.athleteClass === classFilter || s.opponentClass === classFilter) && (genderFilter === "Todos" || s.athleteGender === genderFilter || s.opponentGender === genderFilter));\n  sessions = visibleSessions;\n  const totalPlays =','dashboard states');
rep('      <div style={styles.card}>\n        <h2>Visão geral</h2>','      <div style={styles.card}>\n        <h2>Visão geral</h2>\n        <div style={{ ...styles.grid, marginBottom: 14 }}>\n          <Field label="Classe">\n            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.input}>\n              <option>Todos</option>\n              {CLASSES.map((c) => <option key={c}>{c}</option>)}\n            </select>\n          </Field>\n          <Field label="Gênero">\n            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={styles.input}>\n              <option>Todos</option>\n              {GENDERS.map((g) => <option key={g}>{g}</option>)}\n            </select>\n          </Field>\n        </div>','dashboard ui');
fs.writeFileSync(file,src,'utf8');
console.log('dashboard-gender-v9b aplicado');
