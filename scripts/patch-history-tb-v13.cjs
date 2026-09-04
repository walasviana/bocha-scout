const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: history-tb-v13')) process.exit(0);

src = src.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: history-tb-v13'
);

// Garante que TB entre nas estatísticas por posição.
src = src.replaceAll('if (!pos || pos === "TB") return;', 'if (!pos) return;');

// Garante que o ponto TB seja renderizado no mapa histórico.
src = src.replaceAll('position === "TB" ? null : (() => {', '(() => {');

// Mantém TB fora apenas de "Saídas de jogo".
src = src.replaceAll(
  'const d = mode === "Saídas de jogo" && (!raw || raw.saidas === 0) ? null : raw;',
  'const d = mode === "Saídas de jogo" && (position === "TB" || !raw || raw.saidas === 0) ? null : raw;'
);

// Se houver jogadas de TB, mostra também um resumo explícito abaixo do mapa.
const historyMap = '<HistoricalHeatmap plays={plays}/>';
if (src.includes(historyMap) && !src.includes('Ponto TB')) {
  src = src.replace(
    historyMap,
    `${historyMap}\n      {(() => {\n        const tbPlays = plays.filter((p) => (p.whitePositionTo || p.whitePositionFrom) === "TB");\n        if (tbPlays.length === 0) return null;\n        const tbStats = calcStats(tbPlays);\n        return (\n          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f1f5f9", border: "1px solid #cbd5e1" }}>\n            <strong>Ponto TB</strong> · {tbPlays.length} jogada(s) · {tbStats.efficiency.toFixed(1)}% eficiência\n          </div>\n        );\n      })()}`
  );
}

fs.writeFileSync(file, src, 'utf8');
console.log('history-tb-v13 aplicado');
