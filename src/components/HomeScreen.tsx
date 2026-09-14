import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/inter/latin-800.css';
import {useContext,useState} from 'react';
import {PlayCircle} from '@phosphor-icons/react/dist/csr/PlayCircle';
import {UserPlus} from '@phosphor-icons/react/dist/csr/UserPlus';
import {UsersThree} from '@phosphor-icons/react/dist/csr/UsersThree';
import {ChartBar} from '@phosphor-icons/react/dist/csr/ChartBar';
import {CaretRight} from '@phosphor-icons/react/dist/csr/CaretRight';
import {ArrowLeft} from '@phosphor-icons/react/dist/csr/ArrowLeft';
import {AccountActionsContext} from './AccountActionsContext';
import './HomeScreen.css';
export function HomeHeader({notifications,account}:{notifications:React.ReactNode;account:React.ReactNode}){return <header className="account-toolbar hub-modern-header"><div className="home-brand"><img src="/home-ball-logo.png" alt=""/><span>BOCHA <b>SCOUT</b></span></div><div className="home-header-actions">{notifications}{account}</div></header>}
export default function HomeScreen({onNewTraining,onNewCompetition,onHistory}:{onNewTraining:()=>void;onNewCompetition:()=>void;onHistory:()=>void}){
 const [choosing,setChoosing]=useState(false);const account=useContext(AccountActionsContext);
 const first=account.name.trim().split(/\s+/)[0];const name=first?first.charAt(0).toLocaleUpperCase('pt-BR')+first.slice(1).toLocaleLowerCase('pt-BR'):'';
 return <main className="home-screen">
 {choosing?<section className="home-choose"><button className="home-back" onClick={()=>setChoosing(false)}><ArrowLeft size={20}/>Voltar ao início</button><h1>Qual Scout vamos iniciar?</h1><p>Escolha o tipo da partida para continuar.</p><div className="scout-kind-options"><button onClick={onNewTraining}><strong>Treino</strong><span>Registrar uma sessão de treinamento</span></button><button onClick={onNewCompetition}><strong>Campeonato</strong><span>Registrar uma partida de competição</span></button></div></section>:<>
 <section className="home-greeting"><h1>{name?'Olá, '+name:'Olá!'}</h1><p>Vamos registrar uma partida?</p></section>
 <div className="home-action-list"><button className="home-start" onClick={()=>setChoosing(true)}><PlayCircle weight="light"/><span><strong>Iniciar Scout</strong><small>Ao vivo ou partida gravada</small></span><CaretRight className="home-chevron"/></button>
 <div className="home-registration"><button onClick={account.newAthlete}><span className="home-icon"><UserPlus/></span><CaretRight className="home-chevron"/><strong>Novo atleta</strong></button><button onClick={account.newTeam}><span className="home-icon"><UsersThree/></span><CaretRight className="home-chevron"/><strong>Equipe/Par</strong></button></div>
 <button className="home-history" onClick={onHistory}><span className="home-icon"><ChartBar/></span><span><strong>Histórico e análises</strong><small>Reveja partidas e compare atletas</small></span><CaretRight className="home-chevron"/></button></div></>}
 <footer className="home-footer">BOCHA SCOUT · DADOS QUE INCLUEM</footer></main>;
}
