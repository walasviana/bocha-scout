const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('// PATCH: newscout-filters-v9c')) process.exit(0);
function rep(a,b,l){if(src.includes(b))return;if(!src.includes(a))throw new Error('v9c '+l);src=src.replace(a,b);}
rep('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: newscout-filters-v9c','marker');
rep('  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [currentUserId, setCurrentUserId] = useState("");','  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [currentUserId, setCurrentUserId] = useState("");\n  const [redClassFilter, setRedClassFilter] = useState("");\n  const [blueClassFilter, setBlueClassFilter] = useState("");\n  const [redGenderFilter, setRedGenderFilter] = useState("");\n  const [blueGenderFilter, setBlueGenderFilter] = useState("");','states');
rep('    setAthlete(found?.name || "");\n    setAthleteClass(found?.athleteClass || "");','    setAthlete(found?.name || "");\n    setAthleteClass(found?.athleteClass || "");\n    if (found?.athleteClass) setRedClassFilter(found.athleteClass);\n    if (found?.gender) setRedGenderFilter(found.gender);','red select');
rep('    setOpponent(found?.name || "");\n    setOpponentClass(found?.athleteClass || "");','    setOpponent(found?.name || "");\n    setOpponentClass(found?.athleteClass || "");\n    if (found?.athleteClass) setBlueClassFilter(found.athleteClass);\n    if (found?.gender) setBlueGenderFilter(found.gender);','blue select');
const availPattern=/  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";[\s\S]*?  const eligibleOpponents = availableAthletes\.filter\(\(item\) => item\.id !== selectedAthleteId\);/;
if(!availPattern.test(src)) throw new Error('v9c available');
src=src.replace(availPattern,`  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";
  const availableAthletes = athletes.filter((item) => {
    if (isInternationalCompetition) return true;
    const country = String(item.country || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();
    return country === "brasil";
  });

  const redCandidates = availableAthletes.filter((item) => {
    const classOk = !redClassFilter || item.athleteClass === redClassFilter;
    const genderOk = !redGenderFilter || !item.gender || item.gender === redGenderFilter;
    return classOk && genderOk;
  });

  const eligibleOpponents = availableAthletes.filter((item) => {
    if (item.id === selectedAthleteId) return false;
    const requiredClass = sessionKind === "Campeonato" ? redClassFilter : blueClassFilter;
    const requiredGender = sessionKind === "Campeonato" ? redGenderFilter : blueGenderFilter;
    const classOk = !requiredClass || item.athleteClass === requiredClass;
    const genderOk = !requiredGender || !item.gender || item.gender === requiredGender;
    return classOk && genderOk;
  });`);
const redLabel='<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>';
const filterUi=`                {gameType === "Individual" && (<>
                  <Field label="Classe · Vermelho">
                    <select value={redClassFilter} onChange={(e) => { const v=e.target.value; setRedClassFilter(v); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); if (sessionKind === "Campeonato") { setBlueClassFilter(v); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); } }} style={styles.input}>
                      <option value="">Todas as classes</option>
                      {CLASSES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Gênero · Vermelho">
                    <select value={redGenderFilter} onChange={(e) => { const v=e.target.value; setRedGenderFilter(v); if (sessionKind === "Campeonato") setBlueGenderFilter(v); }} style={styles.input}>
                      <option value="">Selecione</option>
                      {GENDERS.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </Field>
                  <Field label="Classe · Azul">
                    <select value={sessionKind === "Campeonato" ? redClassFilter : blueClassFilter} disabled={sessionKind === "Campeonato"} onChange={(e) => { setBlueClassFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                      <option value="">Todas as classes</option>
                      {CLASSES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </Field>
                  <Field label="Gênero · Azul">
                    <select value={sessionKind === "Campeonato" ? redGenderFilter : blueGenderFilter} disabled={sessionKind === "Campeonato"} onChange={(e) => setBlueGenderFilter(e.target.value)} style={styles.input}>
                      <option value="">Selecione</option>
                      {GENDERS.map((g) => <option key={g}>{g}</option>)}
                    </select>
                  </Field>
                </>)}

                ${redLabel}`;
rep(redLabel,filterUi,'filter ui');
src=src.replace('{availableAthletes.map((item) => (','{redCandidates.map((item) => (');
rep('    if (gameType === "Individual" && selectedAthleteId === selectedOpponentId) {\n      alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");\n      return;\n    }','    if (gameType === "Individual" && selectedAthleteId === selectedOpponentId) {\n      alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");\n      return;\n    }\n\n    if (gameType === "Individual" && (!redGenderFilter || !blueGenderFilter)) {\n      alert("Selecione o gênero dos dois atletas.");\n      return;\n    }\n\n    if (gameType === "Individual" && sessionKind === "Campeonato") {\n      if (athleteClass !== opponentClass) {\n        alert("Em campeonato, os dois atletas precisam ser da mesma classe. Classes diferentes são permitidas apenas em treino.");\n        return;\n      }\n      if (redGenderFilter !== blueGenderFilter) {\n        alert("Em campeonato, os dois atletas precisam ser do mesmo gênero. Gêneros diferentes são permitidos apenas em treino.");\n        return;\n      }\n    }','rules');
rep('          opponentClass: gameType === "Individual" ? opponentClass : "",\n          athleteColor,','          opponentClass: gameType === "Individual" ? opponentClass : "",\n          athleteGender: gameType === "Individual" ? redGenderFilter : "",\n          opponentGender: gameType === "Individual" ? blueGenderFilter : "",\n          athleteColor,','save genders');
rep('    setOpponentClass("");\n    setGender("");','    setOpponentClass("");\n    setGender("");\n    setRedClassFilter("");\n    setBlueClassFilter("");\n    setRedGenderFilter("");\n    setBlueGenderFilter("");','reset');
fs.writeFileSync(file,src,'utf8');
console.log('newscout-filters-v9c aplicado');
