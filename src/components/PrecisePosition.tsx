import {useEffect, useRef, useState} from 'react';
import type {Point} from '../lib/scoutData';
export default function PrecisePosition({cell, point, onPoint, onConfirm, onBack}: {cell: string; point: Point | null; onPoint: (p: Point) => void; onConfirm: () => void; onBack: () => void}) {
  const [preview,setPreview] = useState(point);
  const area=useRef<HTMLDivElement>(null);
  const dragging=useRef(false);
  useEffect(()=>setPreview(point),[point,cell]);
  const locate=(e: React.PointerEvent) => {const r=area.current!.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))};};
  return <section className="precise-position" aria-label={`Posicionamento preciso no quadrado ${cell}`}>
    <h3>Quadrado {cell} · 1 m × 1 m</h3>
    <p>Toque ou arraste para marcar a branca. A orientação é a mesma da quadra.</p>
    <div ref={area} className="precise-square" role="slider" tabIndex={0} aria-label="Posição da branca dentro do quadrado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((point?.x || 0)*100)} aria-valuetext={point ? `x ${Math.round(point.x*100)} cm, y ${Math.round(point.y*100)} cm` : 'Ainda não posicionada'}
      onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const p=point||{x:.5,y:.5};onPoint({x:Math.max(0,Math.min(1,p.x+(e.key==='ArrowLeft'?-.01:e.key==='ArrowRight'?.01:0))),y:Math.max(0,Math.min(1,p.y+(e.key==='ArrowUp'?-.01:e.key==='ArrowDown'?.01:0)))});}}
      onPointerDown={e=>{dragging.current=true;e.currentTarget.setPointerCapture(e.pointerId);setPreview(locate(e));}}
      onPointerMove={e=>{if(dragging.current)setPreview(locate(e));}}
      onPointerUp={e=>{if(!dragging.current)return;dragging.current=false;onPoint(locate(e));}}
      onPointerCancel={()=>{dragging.current=false;setPreview(point);}}>
      <span className="square-origin">x → · y ↓</span>
      {preview && <i className="precise-ball" style={{left:`${preview.x*100}%`,top:`${preview.y*100}%`}}/>}
    </div>
    <p>{point ? `x ${Math.round(point.x*100)} cm · y ${Math.round(point.y*100)} cm a partir do canto superior esquerdo` : 'Marque o ponto para confirmar.'}</p>
    <div className="partial-tabs"><button onClick={onBack}>Trocar quadrado</button><button disabled={!point} onClick={onConfirm}>Confirmar posição</button></div>
  </section>;
}
