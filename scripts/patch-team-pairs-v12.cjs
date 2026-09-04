const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: team-pairs-v12')) process.exit(0);

function rep(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error('v12 trecho não encontrado: ' + label);
  src = src.replace(from, to);
}

function reg(regex, to, label) {
  if (!regex.test(src)) throw new Error('v12 padrão não encontrado: ' + label);
  src = src.replace(regex, to);
}

rep(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: team-pairs-v12',
  'marker'
);

rep(
  'const GAME_TYPES = ["Individual", "Pares", "Equipes"];',
  'const GAME_TYPES = ["Individual", "Par BC3", "Par BC4", "Equipe BC1/BC2"];',
  'game types'
);

rep(
  '    gameType === "Equipes" ? 6 : 4;',
  '    (gameType === "Equipes" || gameType === "Equipe BC1/BC2") ? 6 : 4;',
  'team ends'
);

rep(
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");',
  '  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [teamEntries, setTeamEntries] = useState([]);\n  const [selectedRedTeamEntryId, setSelectedRedTeamEntryId] = useState("");\n  const [selectedBlueTeamEntryId, setSelectedBlueTeamEntryId] = useState("");',
  'team states'
);

rep(
  '    loadAthletesFromDatabase();\n    return () => { active = false; };',
  '    async function loadTeamEntriesFromDatabase() {\n      const { data, error } = await supabase\n        .from("boccia_team_entries")\n        .select("id,name,entity_type,division,country")\n        .order("entity_type")\n        .order("name");\n      if (!active) return;\n      if (error) {\n        console.error("Erro ao carregar equipes/pares do banco:", error);\n        setTeamEntries([]);\n        return;\n      }\n      setTeamEntries(data || []);\n    }\n\n    loadAthletesFromDatabase();\n    loadTeamEntriesFromDatabase();\n    return () => { active = false; };',
  'team loader'
);

rep(
  '  const opponentColor =',
  '  const teamDivision = gameType === "Equipe BC1/BC2" ? "Equipe BC1/BC2" : gameType === "Par BC3" ? "Par BC3" : gameType === "Par BC4" ? "Par BC4" : "";\n  const availableTeamEntries = teamEntries.filter((item) => item.division === teamDivision);\n  function chooseRedTeamEntry(id) {\n    setSelectedRedTeamEntryId(id);\n    const found = availableTeamEntries.find((item) => item.id === id);\n    setAthlete(found?.name || "");\n    if (selectedBlueTeamEntryId === id) { setSelectedBlueTeamEntryId(""); setOpponent(""); }\n  }\n  function chooseBlueTeamEntry(id) {\n    setSelectedBlueTeamEntryId(id);\n    const found = availableTeamEntries.find((item) => item.id === id);\n    setOpponent(found?.name || "");\n  }\n\n  const opponentColor =',
  'team helpers'
);

rep(
  '                      setOpponentClass("");',
  '                      setOpponentClass("");\n                      setSelectedRedTeamEntryId("");\n                      setSelectedBlueTeamEntryId("");',
  'clear team ids on game type change'
);

reg(
  /<Field label="Equipe \/ País">[\s\S]*?<\/Field>/,
  '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />{teamDivision} · Vermelho</span>}>\n                    <select value={selectedRedTeamEntryId} onChange={(e) => chooseRedTeamEntry(e.target.value)} style={styles.input}>\n                      <option value="">Selecione país ou clube</option>\n                      {availableTeamEntries.map((item) => (\n                        <option key={item.id} value={item.id}>{item.name} · {item.entity_type}</option>\n                      ))}\n                    </select>\n                  </Field>',
  'red team field'
);

reg(
  /<Field label="Equipe \/ País adversária">[\s\S]*?<\/Field>/,
  '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#2563eb", display: "inline-block", flex: "0 0 12px" }} />{teamDivision} · Azul</span>}>\n                    <select value={selectedBlueTeamEntryId} onChange={(e) => chooseBlueTeamEntry(e.target.value)} style={styles.input}>\n                      <option value="">Selecione país ou clube</option>\n                      {availableTeamEntries.filter((item) => item.id !== selectedRedTeamEntryId).map((item) => (\n                        <option key={item.id} value={item.id}>{item.name} · {item.entity_type}</option>\n                      ))}\n                    </select>\n                  </Field>',
  'blue team field'
);

rep(
  '                  Em <strong>{gameType}</strong>, basta registrar o nome da equipe/país. Não é necessário cadastrar os atletas da formação.',
  '                  Em <strong>{gameType}</strong>, selecione o país ou clube para o lado vermelho e para o lado azul. A classe já é definida pelo tipo de jogo e não precisa de filtro de gênero ou classe.',
  'team info'
);

rep(
  'alert(gameType === "Individual" ? "Selecione o Atleta Vermelho." : "Digite o nome da equipe/país.");',
  'alert(gameType === "Individual" ? "Selecione o Atleta Vermelho." : "Selecione o país ou clube do lado Vermelho.");',
  'red team alert'
);
rep(
  'alert(gameType === "Individual" ? "Selecione o Atleta Azul." : "Digite o nome da equipe/país adversária.");',
  'alert(gameType === "Individual" ? "Selecione o Atleta Azul." : "Selecione o país ou clube do lado Azul.");',
  'blue team alert'
);

rep(
  '    setSelectedOpponentId("");\n\n    setAthleteClass("");',
  '    setSelectedOpponentId("");\n    setSelectedRedTeamEntryId("");\n    setSelectedBlueTeamEntryId("");\n\n    setAthleteClass("");',
  'reset team ids'
);

src = src.replace('          athleteClass: gameType === "Individual" ? athleteClass : "",', '          athleteClass: gameType === "Individual" ? athleteClass : teamDivision,');
src = src.replace('          opponentClass: gameType === "Individual" ? opponentClass : "",', '          opponentClass: gameType === "Individual" ? opponentClass : teamDivision,');

fs.writeFileSync(file, src, 'utf8');
console.log('team-pairs-v12 aplicado');
