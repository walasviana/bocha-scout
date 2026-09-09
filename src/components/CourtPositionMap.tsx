import { useEffect, useRef } from 'react';
import { courtCells, drawCourtHeatmap } from '../lib/courtHeatmap';
import './CourtHeatmap.css';
const EMPTY_DATA = {};
export default function CourtPositionMap({ selected, onSelect }: { selected: string; onSelect: (position: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvas.current) drawCourtHeatmap(canvas.current, { data: EMPTY_DATA, selected, selectionOnly: true });
  }, [selected]);
  return <div className="court-heatmap" style={{padding:0,maxWidth:560}}>
    <div className="court-heatmap-figure" style={{aspectRatio:'800 / 1120'}}>
      <canvas ref={canvas} role="img" aria-label="Quadra de bocha: selecione a posição da bola branca" />
      {courtCells.map(({position,x,y}) => <button key={position} type="button" className="court-position-hit" aria-label={`Selecionar posição ${position}`} aria-pressed={selected === position} onClick={() => onSelect(position)} style={{left:`${x/8}%`,top:`${(y-176)/1120*100}%`,width:'12.5%',height:`${100/1120*100}%`}} />)}
    </div>
    <button type="button" className="court-tb-detail" aria-pressed={selected === 'TB'} onClick={() => onSelect('TB')}>TB · Tie-break</button>
  </div>;
}
