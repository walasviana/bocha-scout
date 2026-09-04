const fs = require('fs');

const file = 'src/components/BochaScout.tsx';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(oldText, newText, label) {
  if (source.includes(newText)) return;
  if (!source.includes(oldText)) {
    throw new Error(`Heatmap patch failed at ${label}: expected source was not found.`);
  }
  source = source.replace(oldText, newText);
}

replaceOnce(
  '    if (!pos || pos === "TB") return;',
  '    if (!pos) return;',
  'include TB in position performance'
);

replaceOnce(
`  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const positionData = useMemo(() => buildPositionPerformance(filteredPlays), [filteredPlays]);

  const maxFreq = Math.max(1, ...Object.values(positionData).map((d) => d.total));`,
`  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const modePlays = useMemo(() => {
    if (mode === "Aproximação") return filteredPlays.filter((p) => p.play === "Aproximação");
    if (mode === "Batida") return filteredPlays.filter((p) => p.play === "Batida");
    return filteredPlays;
  }, [filteredPlays, mode]);
  const positionData = useMemo(() => buildPositionPerformance(modePlays), [modePlays]);

  const maxFreq = Math.max(1, ...Object.values(positionData).map((d) => d.total));`,
  'filter approximation and hit modes'
);

replaceOnce(
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
  'replace heatmap modes'
);

replaceOnce(
  '        {["Desempenho", "Saídas de jogo", "Acertos", "Erros", "Frequência"].map((item) => (',
  '        {["Desempenho", "Saídas de jogo", "Volume", "Aproximação", "Batida"].map((item) => (',
  'update mode buttons'
);

replaceOnce(
`          const pct = !d ? 0 : mode === "Erros" ? d.errorRate : mode === "Acertos" ? d.accuracy : mode === "Frequência" ? (d.total/maxFreq)*100 : mode === "Saídas de jogo" ? (d.saidas/maxSaidas)*100 : d.efficiency;`,
`          const pct = !d ? 0 : mode === "Volume" ? (d.total/maxFreq)*100 : mode === "Saídas de jogo" ? (d.saidas/maxSaidas)*100 : d.efficiency;`,
  'update cell metric'
);

replaceOnce(
`      </div>
      {detail && (mode === "Saídas de jogo" ? (`,
`      </div>
      {mode !== "Saídas de jogo" && (() => {
        const raw = positionData.TB;
        const pct = !raw ? 0 : mode === "Volume" ? (raw.total / maxFreq) * 100 : raw.efficiency;
        return (
          <button
            onClick={() => raw && setSelectedPosition("TB")}
            style={{
              width: "100%",
              marginTop: 10,
              minHeight: 58,
              border: selectedPosition === "TB" ? "3px solid #0f172a" : "1px solid rgba(15,23,42,.12)",
              borderRadius: 10,
              background: raw ? heatColor(raw) : "#f8fafc",
              color: raw && pct >= 80 ? "white" : "#0f172a",
              fontWeight: 800,
              cursor: raw ? "pointer" : "default",
            }}
          >
            <div>TB · Tie-break</div>
            <div style={{ fontSize: 11 }}>
              {raw ? (mode === "Volume" ? `${raw.total} jogada${raw.total === 1 ? "" : "s"}` : `${pct.toFixed(0)}%`) : "—"}
            </div>
          </button>
        );
      })()}
      {detail && (mode === "Saídas de jogo" ? (`,
  'add tie-break card'
);

fs.writeFileSync(file, source, 'utf8');
console.log('Heatmap patch applied: TB + Volume + Aproximação + Batida.');
