import { useEffect, useRef, useState } from 'react';
import { drawCourtHeatmap, courtCells, CHART_WIDTH, CHART_HEIGHT, cellMetric, type CourtOptions } from '../lib/courtHeatmap';
import './CourtHeatmap.css';

export default function CourtHeatmap(props: CourtOptions & { onSelect?: (position: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [showPositions, setShowPositions] = useState(true);
  const [showMovements, setShowMovements] = useState(true);
  const hasMovements=Object.values(props.data).some(d=>d.movements?.length);
  useEffect(() => { if (canvas.current) drawCourtHeatmap(canvas.current, { ...props, showPositions, showMovements }); }, [props.data, props.mode, props.color, props.name, props.selected, showPositions, showMovements]);
  return <div className="court-heatmap">
    <label className="court-position-toggle"><input type="checkbox" checked={showPositions} onChange={e => setShowPositions(e.target.checked)} /> Mostrar posições</label>
    {hasMovements && props.mode!=='Saídas de jogo' && <label className="court-position-toggle"><input type="checkbox" checked={showMovements} onChange={e=>setShowMovements(e.target.checked)}/> Mostrar deslocamentos da branca</label>}
    <div className="court-heatmap-figure" style={{ aspectRatio: `${CHART_WIDTH} / ${CHART_HEIGHT}` }}>
      <canvas ref={canvas} role="img" aria-label={`Mapa de calor${props.name ? ` de ${props.name}` : ''}. ${props.color || 'Todas as cores'}. ${props.mode || 'Desempenho'}. Os dados de cada posição estão nos botões da quadra.`} />
      {courtCells.map(({ position, x, y }) => {
        const metric = cellMetric(props, position);
        return <button key={position} type="button" className="court-position-hit" disabled={!metric} aria-label={`Posição ${position}: ${metric ? metric.label + (props.mode === 'Volume' || props.mode === 'Saídas de jogo' ? '' : ' de eficiência') : 'sem jogadas'}`} aria-pressed={props.selected === position} onClick={() => props.onSelect?.(position)} style={{ left: `${x / CHART_WIDTH * 100}%`, top: `${y / CHART_HEIGHT * 100}%`, width: `${100 / CHART_WIDTH * 100}%`, height: `${100 / CHART_HEIGHT * 100}%` }} />;
      })}
    </div>
    <p className="court-heatmap-note">{props.mode === 'Volume' ? 'Cor = frequência relativa de jogadas.' : props.mode === 'Saídas de jogo' ? 'Cor = frequência relativa de saídas de jogo.' : 'Eficiência: acerto = 100%, funcional = 50%, erro = 0%.'} Pontos mostram posições medidas nas saídas de jogo. Registros antigos têm apenas o quadrado.</p>
    {!Object.values(props.data).some(d => d.total > 0) && <p className="court-heatmap-note">Sem jogadas registradas para este filtro.</p>}
    {hasMovements && <p className="court-heatmap-note">Seta: posição anterior → nova posição. Tracejada: aproximação entre quadrados em registros sem ponto preciso.</p>}
    {props.mode !== 'Saídas de jogo' && props.data.TB?.total > 0 && <button className="court-tb-detail" aria-pressed={props.selected === 'TB'} onClick={() => props.onSelect?.('TB')}>Tie-break · {props.data.TB.total} jogadas · {Math.round(props.data.TB.efficiency)}%</button>}
  </div>;
}
