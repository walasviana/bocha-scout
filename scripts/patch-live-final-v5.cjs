const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: live-final-v5')) {
  console.log('live-final-v5 já aplicado');
  process.exit(0);
}

function replaceText(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(`live-final-v5: trecho não encontrado: ${label}`);
  src = src.replace(from, to);
}

// 1) Move o painel "Desempenho ao vivo" para o final da tela de scout.
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
          />
`;

if (!src.includes(livePanel)) throw new Error('live-final-v5: painel ao vivo original não encontrado');
src = src.replace(livePanel, '');

const blueScoutEnd = `          <ColorScout
            color="Azul"
            stats={
              endStats.azul
            }
            ranking={
              endBlueRanking
            }
            best={
              endBlueBest
            }
            worst={
              endBlueWorst
            }
          />`;

const blueScoutWithLive = `${blueScoutEnd}

          <LivePerformancePanel
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
replaceText(blueScoutEnd, blueScoutWithLive, 'mover painel ao vivo para baixo');

// 2) Deixa explícito o nome da cor junto do nome dos atletas no painel ao vivo.
replaceText(
  `<div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: athleteColor === "Vermelho" ? "#b91c1c" : "#1d4ed8" }}>{athlete}</div>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: opponentColor === "Vermelho" ? "#b91c1c" : "#1d4ed8" }}>{opponent}</div>`,
  `<div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#b91c1c" }}>Vermelho · {athlete}</div>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: "#1d4ed8" }}>Azul · {opponent}</div>`,
  'nomes das cores no painel ao vivo'
);

// 3) Resultado final: mostra imediatamente os mapas dos DOIS atletas.
const oneFinalMap = `          <div style={{ ...styles.card, textAlign: "left", marginTop: 20 }}>
            <h2>Mapa de calor da partida — {athlete}</h2>
            <p style={styles.helpText}>Somente as jogadas do atleta nesta partida.</p>
            <HistoricalHeatmap plays={athleteMatchPlays} />
          </div>`;

const twoFinalMaps = `          <div style={{ ...styles.card, textAlign: "left", marginTop: 20 }}>
            <h2>Mapas de calor da partida</h2>
            <p style={styles.helpText}>Os dois atletas aparecem no resultado final, cada um com suas próprias jogadas.</p>
            <div style={styles.grid2}>
              <div style={{ ...styles.info, marginTop: 0, borderColor: "#fca5a5", background: "#fef2f2" }}>
                <h3 style={{ marginTop: 0, color: "#b91c1c" }}>Vermelho · {athlete}</h3>
                <HistoricalHeatmap plays={athleteMatchPlays} />
              </div>
              <div style={{ ...styles.info, marginTop: 0, borderColor: "#93c5fd", background: "#eff6ff" }}>
                <h3 style={{ marginTop: 0, color: "#1d4ed8" }}>Azul · {opponent}</h3>
                <HistoricalHeatmap plays={opponentMatchPlays} />
              </div>
            </div>
          </div>`;
replaceText(oneFinalMap, twoFinalMaps, 'dois mapas no resultado final');

// Remove mapa azul duplicado que ficava escondido em "Mais detalhes".
const hiddenOpponentMap = `              <h3 style={{ marginTop: 18 }}>Mapa de calor do adversário — {opponent}</h3>
              <HistoricalHeatmap plays={opponentMatchPlays} />`;
if (src.includes(hiddenOpponentMap)) src = src.replace(hiddenOpponentMap, '');

// Marcação final.
src = src.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: live-final-v5'
);

// Verificações para não publicar uma alteração parcial.
if (!src.includes('Mapas de calor da partida')) throw new Error('live-final-v5: mapas finais não aplicados');
if (!src.includes('Vermelho · {athlete}') || !src.includes('Azul · {opponent}')) throw new Error('live-final-v5: nomes das cores não aplicados');

const firstLive = src.indexOf('<LivePerformancePanel');
const firstRedScout = src.indexOf('<ColorScout\n            color="Vermelho"');
if (firstLive < firstRedScout) throw new Error('live-final-v5: painel ao vivo não foi movido para baixo');

fs.writeFileSync(file, src, 'utf8');
console.log('live-final-v5 aplicado: painel ao vivo embaixo + cores nos nomes + dois mapas finais');
