const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: athlete-selection-v3')) {
  console.log('athlete-selection-v3 já aplicado');
  process.exit(0);
}

function replaceText(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) {
    console.log('Aviso: trecho não encontrado:', label);
    return;
  }
  src = src.replace(from, to);
}

function replaceRegex(regex, to, label) {
  if (!regex.test(src)) {
    console.log('Aviso: padrão não encontrado:', label);
    return;
  }
  src = src.replace(regex, to);
}

replaceText(
  'import { useEffect, useMemo, useState } from "react";',
  'import { useEffect, useMemo, useState } from "react";\nimport { supabase } from "../lib/supabase";\n// PATCH: athlete-selection-v3',
  'import supabase'
);

replaceText(
  '  const [competitionName, setCompetitionName] = useState("");',
  '  const [competitionName, setCompetitionName] = useState("");\n  const [competitionScope, setCompetitionScope] = useState("Nacional");',
  'competition scope state'
);

replaceText(
  [
    '  useEffect(() => {',
    '    setAthletes(safeLoad(STORAGE_KEYS.athletes, []));',
    '    setSessions(safeLoad(STORAGE_KEYS.sessions, []));',
    '  }, []);'
  ].join('\n'),
  [
    '  useEffect(() => {',
    '    let active = true;',
    '    setSessions(safeLoad(STORAGE_KEYS.sessions, []));',
    '',
    '    async function loadAthletesFromDatabase() {',
    '      const localAthletes = safeLoad(STORAGE_KEYS.athletes, []);',
    '      const { data, error } = await supabase',
    '        .from("athletes")',
    '        .select("id,name,class,country,uf")',
    '        .order("name");',
    '',
    '      if (!active) return;',
    '      if (error) {',
    '        console.error("Erro ao carregar atletas do banco:", error);',
    '        setAthletes(localAthletes);',
    '        return;',
    '      }',
    '',
    '      const databaseAthletes = (data || []).map((item) => ({',
    '        id: item.id,',
    '        name: item.name,',
    '        athleteClass: item.class,',
    '        country: item.country,',
    '        uf: item.uf,',
    '        observations: [item.country, item.uf].filter(Boolean).join(" · "),',
    '        source: "database",',
    '      }));',
    '',
    '      const databaseIds = new Set(databaseAthletes.map((item) => item.id));',
    '      const localOnly = localAthletes.filter((item) => !databaseIds.has(item.id));',
    '      setAthletes([...databaseAthletes, ...localOnly].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));',
    '    }',
    '',
    '    loadAthletesFromDatabase();',
    '    return () => { active = false; };',
    '  }, []);'
  ].join('\n'),
  'database athlete loader'
);

replaceText(
  '  const [athleteColor, setAthleteColor] = useState("");',
  '  const [athleteColor, setAthleteColor] = useState("Vermelho");',
  'default athlete color'
);

replaceRegex(
  /  const eligibleOpponents = athletes\.filter\(\(item\) => \{[\s\S]*?\n  \}\);/,
  [
    '  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";',
    '  const availableAthletes = athletes.filter((item) => {',
    '    if (isInternationalCompetition) return true;',
    '    const country = String(item.country || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase();',
    '    return country === "brasil";',
    '  });',
    '',
    '  const eligibleOpponents = availableAthletes.filter((item) => item.id !== selectedAthleteId);'
  ].join('\n'),
  'available athletes'
);

replaceText(
  [
    '    // Ao trocar o atleta principal, limpa o adversário para evitar seleção incompatível.',
    '    setSelectedOpponentId("");',
    '    setOpponent("");',
    '    setOpponentClass("");'
  ].join('\n'),
  [
    '    // Vermelho e azul podem ser escolhidos em qualquer ordem.',
    '    if (selectedOpponentId === id) {',
    '      setSelectedOpponentId("");',
    '      setOpponent("");',
    '      setOpponentClass("");',
    '    }'
  ].join('\n'),
  'independent selections'
);

replaceText(
  '    setAthleteColor("");\n    setSessionKind("Treino");',
  '    setAthleteColor("Vermelho");\n    setSessionKind("Treino");\n    setCompetitionScope("Nacional");',
  'new game defaults'
);

replaceText(
  [
    '                <Field label="Sessão">',
    '                  <select value={sessionKind} onChange={(e) => setSessionKind(e.target.value)} style={styles.input}>',
    '                    <option>Treino</option>',
    '                    <option>Campeonato</option>',
    '                  </select>',
    '                </Field>'
  ].join('\n'),
  [
    '                <Field label="Sessão">',
    '                  <select value={sessionKind} onChange={(e) => setSessionKind(e.target.value)} style={styles.input}>',
    '                    <option>Treino</option>',
    '                    <option>Campeonato</option>',
    '                  </select>',
    '                </Field>',
    '',
    '                {sessionKind === "Campeonato" && (',
    '                  <Field label="Abrangência do campeonato">',
    '                    <select value={competitionScope} onChange={(e) => { setCompetitionScope(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>',
    '                      <option value="Nacional">Campeonato Nacional · Brasil</option>',
    '                      <option value="Internacional">Campeonato Internacional · Todos os países</option>',
    '                    </select>',
    '                  </Field>',
    '                )}'
  ].join('\n'),
  'competition scope field'
);

replaceRegex(
  /<Field label="Atleta">[\s\S]*?<\/Field>/,
  [
    '<Field label="🔴 Atleta Vermelho">',
    '                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>',
    '                      <option value="">Selecione o atleta vermelho</option>',
    '                      {availableAthletes.map((item) => (',
    '                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}{item.country ? " · " + item.country : ""}{item.uf ? "/" + item.uf : ""}</option>',
    '                      ))}',
    '                    </select>',
    '                  </Field>'
  ].join('\n'),
  'red athlete field'
);

replaceRegex(
  /<Field label="Adversário cadastrado">[\s\S]*?<\/Field>/,
  [
    '<Field label="🔵 Atleta Azul">',
    '                    <select value={selectedOpponentId} onChange={(e) => chooseRegisteredOpponent(e.target.value)} style={styles.input}>',
    '                      <option value="">Selecione o atleta azul</option>',
    '                      {eligibleOpponents.map((item) => (',
    '                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}{item.country ? " · " + item.country : ""}{item.uf ? "/" + item.uf : ""}</option>',
    '                      ))}',
    '                    </select>',
    '                  </Field>'
  ].join('\n'),
  'blue athlete field'
);

replaceRegex(
  /\s*<Field label=\{gameType === "Individual" \? "Cor do atleta" : "Cor da equipe"\}>[\s\S]*?<\/Field>/,
  '',
  'remove color selector'
);

replaceText('alert(gameType === "Individual" ? "Selecione um atleta cadastrado." : "Digite o nome da equipe/país.");', 'alert(gameType === "Individual" ? "Selecione o Atleta Vermelho." : "Digite o nome da equipe/país.");', 'red alert');
replaceText('alert(gameType === "Individual" ? "Selecione um adversário cadastrado." : "Digite o nome da equipe/país adversária.");', 'alert(gameType === "Individual" ? "Selecione o Atleta Azul." : "Digite o nome da equipe/país adversária.");', 'blue alert');
replaceText('alert("Selecione um atleta cadastrado.");', 'alert("Selecione o Atleta Vermelho.");', 'red alert 2');
replaceText('alert("Selecione um adversário cadastrado.");', 'alert("Selecione o Atleta Azul.");', 'blue alert 2');
replaceText('alert("O atleta e o adversário precisam ser pessoas diferentes.");', 'alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");', 'same athlete alert');

replaceRegex(
  /    if \(!athleteColor\) \{[\s\S]*?\n    \}/,
  '    if (athleteColor !== "Vermelho") setAthleteColor("Vermelho");',
  'fixed red side'
);

src = src.replace('O mesmo cadastro pode ser usado como atleta principal ou adversário. No Individual, o adversário é selecionado entre atletas cadastrados da mesma classe.', 'O mesmo cadastro pode ser usado como Atleta Vermelho ou Atleta Azul. No Novo Scout, os atletas do banco já ficam disponíveis para seleção.');
src = src.replace('line(`Atleta: ${athlete} (${athleteColor})`);', 'line(`Atleta Vermelho: ${athlete}`);');
src = src.replace('line(`Adversário: ${opponent} (${opponentColor})`);', 'line(`Atleta Azul: ${opponent}`);');

fs.writeFileSync(file, src, 'utf8');
console.log('athlete-selection-v3 aplicado');
