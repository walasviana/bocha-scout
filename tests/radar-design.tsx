import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import PartialPerformance from '../src/components/PartialPerformance';
import {usedFoundations,radarData} from '../src/lib/foundationRadar';
import '../src/styles.css';
const initial=[{color:'Vermelho',play:'Aproximação',result:'Acerto',end:'End 1'},{color:'Azul',play:'Batida',result:'Erro',end:'End 1'},{color:'Azul',play:'Mover branca',result:'Funcional',end:'End 2'}];
const series=['Vermelho','Azul'].map(color=>({name:color,color,plays:initial.filter(p=>p.color===color)}));
if(usedFoundations(series).join(',')!=='Aproximação,Batida,Mover branca')throw Error('Unexpected foundations');
const values=radarData(series);if(values[1].values[0].value!==null||values[1].values[1].value!==0)throw Error('Missing differs from zero');
if(usedFoundations([{name:'Empty',color:'Azul',plays:[{play:'Falta',result:'invalid'}]}]).length)throw Error('Invalid result axis');
function Test(){const [plays,setPlays]=useState(initial);return <main style={{maxWidth:800,margin:'auto',padding:12,fontFamily:'Arial'}}><p>Validação: cálculos OK</p><button onClick={()=>setPlays([...plays,{color:'Vermelho',play:'Tabela',result:'Acerto',end:'End 1'}])}>Registrar Tabela</button><PartialPerformance plays={plays} gameType="Individual" athlete="ATLETA VERMELHO" opponent="ATLETA AZUL" athleteColor="Vermelho" scoutMode="live"/></main>;}
createRoot(document.getElementById('root')!).render(<Test/>);
