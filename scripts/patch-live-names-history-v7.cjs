const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: live-names-history-v7')) {
  console.log('live-names-history-v7 já aplicado');
  process.exit(0);
}

function replaceText(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`live-names-history-v7: trecho não encontrado: ${label}`);
  src = src.replace(from, to);
}

// No Scout ao vivo, mostra somente o nome do atleta; a cor do texto identifica o lado.
replaceText(
  '<div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#b91c1c" }}>Vermelho · {athlete}</div>\n        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#1d4ed8" }}>Azul · {opponent}</div>',
  '<div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#b91c1c" }}>{athlete}</div>\n        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#1d4ed8" }}>{opponent}</div>',
  'nomes coloridos sem texto Vermelho/Azul'
);

const livePanel = `          <LivePerformancePanel
            endName={currentEndName}
            athlete={athlete}
            opponent={opponent}
            athleteColor={athleteColor}
            opponentColor={opponentColor}
            athleteEnd={liveAthleteEndStats}
            opponentEnd={liveOpponentEndStats}
            athleteMatch={liveAthleteMatchStats}
            opponentMatch={liveOpponentMatchStats}
          />`;

const historyCard = `${livePanel}

          <div style={{ ...styles.card, marginTop: 15 }}>
            <h2 style={{ marginBottom: 12 }}>Histórico de jogadas · {currentEndName}</h2>
            {playsHistory.filter((p) => p.end === currentEndName).length === 0 ? (
              <p style={styles.empty}>Nenhuma jogada registrada neste End.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th>Cor</th>
                      <th>Bola</th>
                      <th>Branca</th>
                      <th>Fundamento</th>
                      <th>Resultado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {playsHistory
                      .filter((p) => p.end === currentEndName)
                      .map((play) => (
                        <tr key={play.id}>
                          <td style={{ fontWeight: 800, color: play.color === "Vermelho" ? "#b91c1c" : "#1d4ed8" }}>{play.color}</td>
                          <td>{play.ball}</td>
                          <td>
                            {play.whitePositionFrom}
                            {play.play === "Mover branca" && play.whitePositionTo !== play.whitePositionFrom ? ` para ${play.whitePositionTo}` : ""}
                          </td>
                          <td>{play.play}</td>
                          <td><ResultBadge result={play.result} /></td>
                          <td>
                            <button onClick={() => removePlay(play.id)} style={styles.delete} title="Excluir jogada">×</button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>`;

replaceText(livePanel, historyCard, 'histórico de jogadas abaixo do Scout ao vivo');

src = src.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: live-names-history-v7'
);

if (src.includes('Vermelho · {athlete}</div>') || src.includes('Azul · {opponent}</div>')) {
  throw new Error('live-names-history-v7: texto de cor ainda aparece junto aos nomes no painel ao vivo');
}
if (!src.includes('Histórico de jogadas · {currentEndName}')) {
  throw new Error('live-names-history-v7: histórico não foi inserido');
}
if (!src.includes('onClick={() => removePlay(play.id)}')) {
  throw new Error('live-names-history-v7: botão excluir não foi inserido');
}

fs.writeFileSync(file, src, 'utf8');
console.log('live-names-history-v7 aplicado: nomes coloridos + histórico de jogadas com exclusão');
