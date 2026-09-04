const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: heatmap-v2')) {
  console.log('heatmap-v2 já aplicado');
  process.exit(0);
}

function replaceExact(from, to, label) {
  if (src.includes(to)) return;
  if (!src.includes(from)) {
    console.log('Aviso heatmap-v2:', label, 'não encontrado');
    return;
  }
  src = src.replace(from, to);
}

replaceExact(
  'import { useEffect, useMemo, useState } from "react";',
  'import { useEffect, useMemo, useState } from "react";\n// PATCH: heatmap-v2',
  'marker'
);

replaceExact(
  '    if (!pos || pos === "TB") return;',
  '    if (!pos) return;',
  'incluir TB no desempenho por posição'
);

replaceExact(
`  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const positionData = useMemo(() => buildPositionPerformance(filteredPlays), [filteredPlays]);`,
`  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const modePlays = useMemo(() => {
    if (mode === "Aproximação") return filteredPlays.filter((p) => p.play === "Aproximação");
    if (mode === "Batida") return filteredPlays.filter((p) => p.play === "Batida");
    return filteredPlays;
  }, [filteredPlays, mode]);
  const positionData = useMemo(() => buildPositionPerformance(modePlays), [modePlays]);`,
  'filtro por fundamento'
);

replaceExact(
`    let value = d.efficiency;
    if (mode === "Acertos") value = d.accuracy;
    if (mode === "Erros") value = d.errorRate;
    if (mode === "Frequência") value = (d.total / maxFreq) * 100;
    if (mode === "Saídas de jogo") value = (d.saidas / maxSaidas) * 100;
    if (mode === "Erros") {
      if (value >= 80) return "#dc2626"; if (value >= 60) return "#f97316"; if (value >= 40) return "#facc15"; if (value >= 20) return "#a3e635"; return "#16a34a";
    }
    if (value >= 80) return "#15803d"; if (value >= 60) return "#84cc16"; if (value >= 40) return "#facc15"; if (value >= 20) return "#fb923c"; return "#ef4444";`,
`    let value = d.efficiency;
    if (mode === "Volume") value = (d.total / maxFreq) * 100;
    if (mode === "Saídas de jogo") value = (d.saidas / maxSaidas) * 100;
    if (value >= 80) return "#15803d"; if (value >= 60) return "#84cc16"; if (value >= 40) return "#facc15"; if (value >= 20) return "#fb923c"; return "#ef4444";`,
  'cores por modo'
);

replaceExact(
  '        {["Desempenho", "Saídas de jogo", "Acertos", "Erros", "Frequência"].map((item) => (',
  '        {["Desempenho", "Saídas de jogo", "Volume", "Aproximação", "Batida"].map((item) => (',
  'botões de modo'
);

replaceExact(
  ' : position === "TB" ? null : (() => {',
  ' : (() => {',
  'mostrar TB no mapa'
);

replaceExact(
  '          const d = mode === "Saídas de jogo" && (!raw || raw.saidas === 0) ? null : raw;',
  '          const d = mode === "Saídas de jogo" && (position === "TB" || !raw || raw.saidas === 0) ? null : raw;',
  'excluir TB de saídas'
);

replaceExact(
  '          const pct = !d ? 0 : mode === "Erros" ? d.errorRate : mode === "Acertos" ? d.accuracy : mode === "Frequência" ? (d.total/maxFreq)*100 : mode === "Saídas de jogo" ? (d.saidas/maxSaidas)*100 : d.efficiency;',
  '          const pct = !d ? 0 : mode === "Volume" ? (d.total/maxFreq)*100 : mode === "Saídas de jogo" ? (d.saidas/maxSaidas)*100 : d.efficiency;',
  'métrica da célula'
);

replaceExact(
  'cursor: d ? "pointer" : "default", position: "relative" }}>',
  'cursor: d ? "pointer" : "default", position: "relative", gridColumn: position === "TB" ? "1 / -1" : undefined }}>',
  'TB em faixa própria'
);

const check = ts.transpileModule(src, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
  fileName: 'BochaScout.tsx',
});
const errors = (check.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
if (errors.length) {
  const text = errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n');
  throw new Error('heatmap-v2 gerou TSX inválido:\n' + text);
}

fs.writeFileSync(file, src, 'utf8');
console.log('heatmap-v2 aplicado: TB, Volume, Aproximação e Batida');
