const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: athlete-selection-v2')) {
  console.log('athlete-selection-v2 já aplicado');
  process.exit(0);
}

function replaceOnce(from, to, label) {
  if (!src.includes(from)) {
    throw new Error(`Trecho não encontrado: ${label}`);
  }
  src = src.replace(from, to);
}

replaceOnce(
  'import { useEffect, useMemo, useState } from "react";',
  'import { useEffect, useMemo, useState } from "react";\nimport { supabase } from "../lib/supabase";\n// PATCH: athlete-selection-v2',
  'import supabase'
);

replaceOnce(
  '  const [competitionName, setCompetitionName] = useState("");',
  '  const [competitionName, setCompetitionName] = useState("");\n  const [competitionScope, setCompetitionScope] = useState("Nacional");',
  'competitionScope state'
);

replaceOnce(
`  useEffect(() => {
    setAthletes(safeLoad(STORAGE_KEYS.athletes, []));
    setSessions(safeLoad(STORAGE_KEYS.sessions, []));
  }, []);`,
`  useEffect(() => {
    let active = true;
    setSessions(safeLoad(STORAGE_KEYS.sessions, []));

    async function loadAthletesFromDatabase() {
      const localAthletes = safeLoad(STORAGE_KEYS.athletes, []);
      const { data, error } = await supabase
        .from("athletes")
        .select("id,name,class,country,uf")
        .order("name");

      if (!active) return;

      if (error) {
        console.error("Erro ao carregar atletas do banco:", error);
        setAthletes(localAthletes);
        return;
      }

      const databaseAthletes = (data || []).map((item) => ({
        id: item.id,
        name: item.name,
        athleteClass: item.class,
        country: item.country,
        uf: item.uf,
        observations: [item.country, item.uf].filter(Boolean).join(" · "),
        source: "database",
      }));

      const databaseIds = new Set(databaseAthletes.map((item) => item.id));
      const localOnly = localAthletes.filter((item) => !databaseIds.has(item.id));
      setAthletes([...databaseAthletes, ...localOnly].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }

    loadAthletesFromDatabase();
    return () => { active = false; };
  }, []);`,
  'load athletes effect'
);

replaceOnce(
  '  const [athleteColor, setAthleteColor] = useState("");',
  '  const [athleteColor, setAthleteColor] = useState("Vermelho");',
  'default red color'
);

replaceOnce(
`    // Ao trocar o atleta principal, limpa o adversário para evitar seleção incompatível.
    setSelectedOpponentId("");
    setOpponent("");
    setOpponentClass("");`,
`    // Mantém o atleta azul selecionado, exceto se for a mesma pessoa.
    if (selectedOpponentId === id) {
      setSelectedOpponentId("");
      setOpponent("");
      setOpponentClass("");
    }`,
  'independent red/blue selection'
);

replaceOnce(
`  const eligibleOpponents = athletes.filter((item) => {
    if (item.id === selectedAthleteId) return false;
    // Em treino, qualquer atleta cadastrado pode ser adversário, mesmo de outra classe.
    // Em campeonato, mantém a regra de confronto entre atletas da mesma classe.
    if (sessionKind === "Treino") return true;
    return !athleteClass || item.athleteClass === athleteClass;
  });`,
`  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";
  const availableAthletes = athletes.filter((item) => {
    if (isInternationalCompetition) return true;
    const country = String(item.country || "")
      .normalize("NFD")
      .replace(/[\\u0300-\\u036f]/g, "")
      .toLowerCase();
    return country === "brasil";
  });

  const eligibleOpponents = availableAthletes.filter((item) => item.id !== selectedAthleteId);`,
  'national/international athlete pool'
);

replaceOnce(
  '    setAthleteColor("");\n    setSessionKind("Treino");',
  '    setAthleteColor("Vermelho");\n    setSessionKind("Treino");\n    setCompetitionScope("Nacional");',
  'newGame defaults'
);

replaceOnce(
`                <Field label="Sessão">
                  <select value={sessionKind} onChange={(e) => setSessionKind(e.target.value)} style={styles.input}>
                    <option>Treino</option>
                    <option>Campeonato</option>
                  </select>
                </Field>`,
`                <Field label="Sessão">
                  <select value={sessionKind} onChange={(e) => setSessionKind(e.target.value)} style={styles.input}>
                    <option>Treino</option>
                    <option>Campeonato</option>
                  </select>
                </Field>

                {sessionKind === "Campeonato" && (
                  <Field label="Abrangência do campeonato">
                    <select value={competitionScope} onChange={(e) => { setCompetitionScope(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>
                      <option value="Nacional">Campeonato Nacional · Brasil</option>
                      <option value="Internacional">Campeonato Internacional · Todos os países</option>
                    </select>
                  </Field>
                )}`,
  'competition scope field'
);

replaceOnce(
`                  <Field label="Atleta">
                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>
                      <option value="">Selecione o atleta</option>
                      {athletes.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>
                      ))}
                    </select>
                    {athletes.length === 0 && (
                      <button onClick={() => setView("athletes")} style={{ ...styles.button, background: "#475569", marginTop: 8, width: "100%" }}>
                        + Cadastrar primeiro atleta
                      </button>
                    )}
                  </Field>`,
`                  <Field label="🔴 Atleta Vermelho">
                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>
                      <option value="">Selecione o atleta vermelho</option>
                      {availableAthletes.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}{item.country ? ` · ${item.country}` : ""}{item.uf ? `/${item.uf}` : ""}</option>
                      ))}
                    </select>
                    {availableAthletes.length === 0 && (
                      <div style={{ marginTop: 7, fontSize: 12, color: "#b45309" }}>Nenhum atleta disponível nesta base.</div>
                    )}
                  </Field>`,
  'red athlete field'
);

replaceOnce(
`                  <Field label="Adversário cadastrado">
                    <select
                      value={selectedOpponentId}
                      onChange={(e) => chooseRegisteredOpponent(e.target.value)}
                      style={styles.input}
                      disabled={!selectedAthleteId}
                    >
                      <option value="">{selectedAthleteId ? "Selecione o adversário" : "Selecione primeiro o atleta"}</option>
                      {eligibleOpponents.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}</option>
                      ))}
                    </select>
                    {selectedAthleteId && eligibleOpponents.length === 0 && (
                      <div style={{ marginTop: 7, fontSize: 12, color: "#b45309" }}>
                        {sessionKind === "Treino"
                          ? "Nenhum outro atleta está cadastrado. Cadastre o adversário na aba Atletas."
                          : `Nenhum outro atleta da classe ${athleteClass} está cadastrado. Cadastre o adversário na aba Atletas.`}
                      </div>
                    )}
                  </Field>`,
`                  <Field label="🔵 Atleta Azul">
                    <select
                      value={selectedOpponentId}
                      onChange={(e) => chooseRegisteredOpponent(e.target.value)}
                      style={styles.input}
                    >
                      <option value="">Selecione o atleta azul</option>
                      {eligibleOpponents.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}{item.country ? ` · ${item.country}` : ""}{item.uf ? `/${item.uf}` : ""}</option>
                      ))}
                    </select>
                  </Field>`,
  'blue athlete field'
);

replaceOnce(
`                <Field label={gameType === "Individual" ? "Cor do atleta" : "Cor da equipe"}>
                  <select value={athleteColor} onChange={(e) => setAthleteColor(e.target.value)} style={styles.input}>
                    <option value="">Selecione</option>
                    <option value="Vermelho">Vermelho</option>
                    <option value="Azul">Azul</option>
                  </select>
                </Field>`,
`                {gameType !== "Individual" && (
                  <div style={styles.info}>
                    O primeiro lado será <strong>Vermelho</strong> e o segundo lado será <strong>Azul</strong>.
                  </div>
                )}`,
  'remove color selector'
);

replaceOnce(
`              {gameType === "Individual" && athlete && (
                <div style={styles.info}>
                  <strong>{athlete}</strong> · {athleteClass}
                  <br />
                  Cadastro carregado automaticamente.
                </div>
              )}`,
`              {gameType === "Individual" && (
                <div style={styles.info}>
                  <strong>🔴 Vermelho:</strong> {athlete || "não selecionado"}
                  <br />
                  <strong>🔵 Azul:</strong> {opponent || "não selecionado"}
                  <br />
                  {sessionKind === "Campeonato" ? (competitionScope === "Internacional" ? "Base internacional: todos os países." : "Base nacional: somente Brasil.") : "Treino: base nacional do Brasil."}
                </div>
              )}`,
  'selection summary'
);

replaceOnce('alert(gameType === "Individual" ? "Selecione um atleta cadastrado." : "Digite o nome da equipe/país.");', 'alert(gameType === "Individual" ? "Selecione o Atleta Vermelho." : "Digite o nome da equipe/país.");', 'start red alert 1');
replaceOnce('alert(gameType === "Individual" ? "Selecione um adversário cadastrado." : "Digite o nome da equipe/país adversária.");', 'alert(gameType === "Individual" ? "Selecione o Atleta Azul." : "Digite o nome da equipe/país adversária.");', 'start blue alert 1');
replaceOnce('alert("Selecione um atleta cadastrado.");', 'alert("Selecione o Atleta Vermelho.");', 'start red alert 2');
replaceOnce('alert("Selecione um adversário cadastrado.");', 'alert("Selecione o Atleta Azul.");', 'start blue alert 2');
replaceOnce('alert("O atleta e o adversário precisam ser pessoas diferentes.");', 'alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");', 'same athlete alert');

replaceOnce(
`    if (!athleteColor) {
      alert(gameType === "Individual" ? "Selecione a cor do atleta." : "Selecione a cor da equipe.");
      return;
    }`,
`    // O primeiro lado do cadastro é sempre Vermelho; o segundo é sempre Azul.
    if (athleteColor !== "Vermelho") setAthleteColor("Vermelho");`,
  'fixed colors validation'
);

src = src.replace('O mesmo cadastro pode ser usado como atleta principal ou adversário. No Individual, o adversário é selecionado entre atletas cadastrados da mesma classe.', 'O mesmo cadastro pode ser usado como Atleta Vermelho ou Atleta Azul. No Novo Scout, os atletas do banco já ficam disponíveis para seleção.');
src = src.replace('line(`Atleta: ${athlete} (${athleteColor})`);', 'line(`Atleta Vermelho: ${athlete}`);');
src = src.replace('line(`Adversário: ${opponent} (${opponentColor})`);', 'line(`Atleta Azul: ${opponent}`);');

fs.writeFileSync(file, src);
console.log('athlete-selection-v2 aplicado com sucesso');
