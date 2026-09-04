const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: tiebreak-v8')) {
  console.log('tiebreak-v8 já aplicado');
  process.exit(0);
}

function mustReplace(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`tiebreak-v8: trecho não encontrado: ${label}`);
  src = src.replace(from, to);
}

// Helpers globais para placar regular e vencedor por tie-break.
mustReplace(
`function getSessionWinner(s) {
  const a = Number(s.totalAthlete || 0);
  const o = Number(s.totalOpponent || 0);
  if (a > o) return "Vitória";
  if (a < o) return "Derrota";
  return "Empate";
}`,
`function getRegularScoreTotals(scores = {}) {
  return Object.entries(scores || {}).reduce(
    (acc, [name, score]) => {
      if (String(name).startsWith("Tie-Break")) return acc;
      acc.athlete += Number(score?.athlete || 0);
      acc.opponent += Number(score?.opponent || 0);
      return acc;
    },
    { athlete: 0, opponent: 0 }
  );
}

function getTieBreakWinnerFromScores(scores = {}) {
  const entries = Object.entries(scores || {})
    .filter(([name]) => String(name).startsWith("Tie-Break"));
  for (let i = entries.length - 1; i >= 0; i--) {
    const [, score] = entries[i];
    const a = Number(score?.athlete || 0);
    const o = Number(score?.opponent || 0);
    if (a > o) return "athlete";
    if (o > a) return "opponent";
  }
  return null;
}

function getSessionWinner(s) {
  const totals = getRegularScoreTotals(s?.scores || {});
  if (totals.athlete > totals.opponent) return "Vitória";
  if (totals.athlete < totals.opponent) return "Derrota";
  const tbWinner = getTieBreakWinnerFromScores(s?.scores || {});
  if (tbWinner === "athlete") return "Vitória";
  if (tbWinner === "opponent") return "Derrota";
  return "—";
}`,
'helpers de resultado'
);

// Estado para múltiplos tie-breaks.
mustReplace(
`  const [tieBreak, setTieBreak] =
    useState(false);`,
`  const [tieBreak, setTieBreak] =
    useState(false);
  const [tieBreakRound, setTieBreakRound] = useState(1);`,
'tieBreakRound state'
);

mustReplace(
`  const currentEndName = ends[currentEnd];`,
`  const currentEndName = tieBreak && currentEnd >= regularEnds.length
    ? (tieBreakRound === 1 ? "Tie-Break" : \`Tie-Break \${tieBreakRound}\`)
    : ends[currentEnd];`,
'currentEndName dinâmico'
);

// Inclui tieBreakRound no undo.
mustReplace(
`      tieBreak,
      stage,`,
`      tieBreak,
      tieBreakRound,
      stage,`,
'undo snapshot tieBreakRound'
);
mustReplace(
`    setTieBreak(snapshot.tieBreak);
    setStage(snapshot.stage);`,
`    setTieBreak(snapshot.tieBreak);
    setTieBreakRound(snapshot.tieBreakRound || 1);
    setStage(snapshot.stage);`,
'undo restore tieBreakRound'
);

// Reseta rodada do TB ao iniciar/nova partida.
src = src.replaceAll('    setTieBreak(false);\n', '    setTieBreak(false);\n    setTieBreakRound(1);\n');

// Substitui a lógica final de saveEndScore.
const oldBlock = `    /*
      Se ainda existem Ends
    */

    if (currentEnd < ends.length - 1) {
      startNewEnd(currentEnd + 1);

      return;
    }

    /*
      Último End regular:
      empate na soma abre o Tie-Break
      (branca fixa na posição TB)
    */

    if (currentEndName !== "Tie-Break") {
      const totals = Object.values(
        updatedScores
      ).reduce(
        (acc, s) => ({
          athlete:
            acc.athlete + Number(s.athlete),
          opponent:
            acc.opponent +
            Number(s.opponent),
        }),
        { athlete: 0, opponent: 0 }
      );

      if (
        totals.athlete === totals.opponent
      ) {
        setTieBreak(true);
        startNewEnd(currentEnd + 1, "TB");

        return;
      }
    }

    setFinished(true);
    setStarted(false);`;

const newBlock = `    const isTieBreakEnd = String(currentEndName).startsWith("Tie-Break");

    // Ends regulares: segue normalmente até o último.
    if (!isTieBreakEnd && currentEnd < regularEnds.length - 1) {
      startNewEnd(currentEnd + 1);
      return;
    }

    // Último End regular: se o placar regular empatar, abre o Tie-Break.
    if (!isTieBreakEnd) {
      const totals = getRegularScoreTotals(updatedScores);
      if (totals.athlete === totals.opponent) {
        setTieBreak(true);
        setTieBreakRound(1);
        startNewEnd(regularEnds.length, "TB");
        return;
      }
      setFinished(true);
      setStarted(false);
      return;
    }

    // Tie-Break nunca pode encerrar empatado. Se empatar, abre outro TB.
    if (a === o) {
      setTieBreak(true);
      setTieBreakRound((round) => round + 1);
      startNewEnd(regularEnds.length, "TB");
      return;
    }

    setFinished(true);
    setStarted(false);`;

mustReplace(oldBlock, newBlock, 'lógica de encerramento e repetição do tie-break');

// Placar total ao vivo/final: soma apenas Ends regulares.
const oldTotals = `  const totalAthlete =
    Object.values(scores).reduce(
      (sum, score) =>
        sum +
        Number(
          score?.athlete || 0
        ),
      0
    );

  const totalOpponent =
    Object.values(scores).reduce(
      (sum, score) =>
        sum +
        Number(
          score?.opponent || 0
        ),
      0
    );`;
const newTotals = `  const regularScoreTotals = getRegularScoreTotals(scores);
  const totalAthlete = regularScoreTotals.athlete;
  const totalOpponent = regularScoreTotals.opponent;`;
mustReplace(oldTotals, newTotals, 'totais sem tie-break');

// Salvamento da sessão também usa somente pontos regulares.
const oldSessionTotals = `    const totals = Object.values(scores).reduce(
      (acc, value) => ({
        athlete: acc.athlete + Number(value.athlete || 0),
        opponent: acc.opponent + Number(value.opponent || 0),
      }),
      { athlete: 0, opponent: 0 }
    );`;
const newSessionTotals = `    const totals = getRegularScoreTotals(scores);`;
mustReplace(oldSessionTotals, newSessionTotals, 'totais salvos sem tie-break');

// Melhor End ignora tie-break.
mustReplace(
`    Object.entries(scores).forEach(([name, s]) => {
      const diffA = Number(s.athlete) - Number(s.opponent);`,
`    Object.entries(scores).forEach(([name, s]) => {
      if (String(name).startsWith("Tie-Break")) return;
      const diffA = Number(s.athlete) - Number(s.opponent);`,
'melhor end sem tie-break'
);

// Na tabela de parciais, TB continua visível, mas não soma no placar principal.
// Ajusta texto do botão de placar do TB repetido.
src = src.replace(
  '        Salvar End e iniciar próximo',
  '        {String(endName).startsWith("Tie-Break") ? "Salvar Tie-Break" : "Salvar End e iniciar próximo"}'
);

src = src.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: tiebreak-v8'
);

if (!src.includes('getRegularScoreTotals')) throw new Error('tiebreak-v8: helper de placar regular ausente');
if (!src.includes('setTieBreakRound((round) => round + 1)')) throw new Error('tiebreak-v8: repetição de TB ausente');
if (!src.includes('const totalAthlete = regularScoreTotals.athlete')) throw new Error('tiebreak-v8: placar ainda soma TB');

fs.writeFileSync(file, src, 'utf8');
console.log('tiebreak-v8 aplicado: sem empate final e TB fora do placar');
