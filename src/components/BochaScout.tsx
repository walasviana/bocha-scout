// @ts-nocheck
import './ClassicScoreboard.css';
import '../filter-screens.css';
import MobileDisclosure from './MobileDisclosure';
import {
  ArrowCounterClockwise,
  CaretLeft,
  House,
  Clock,
  Timer,
  Circle,
  Crosshair,
  XCircle,
  FunnelSimple,
  UsersThree,
  Folders,
  Buildings,
  X,
  CaretDown,
} from '@phosphor-icons/react';
import {
  Trophy,
  Play,
  Broadcast,
  CalendarBlank,
  Users,
  Tag,
  SlidersHorizontal,
  MagnifyingGlass,
  Star,
  User,
} from '@phosphor-icons/react';
import './ScoutCapture.css';
import HomeScreen from './HomeScreen';
import HeaderNavigation from './HeaderNavigation';
import FoundationRadar from './FoundationRadar';
import './LiveTimerBridge.css';
import AthleteComparison from './AthleteComparison';
import AppIcon from './AppIcon';
import {matchSeries} from '../lib/foundationRadar';
import {useContext} from 'react';
import {createPortal} from 'react-dom';
import {DataPanelContext} from './DataPanelContext';
import {localUser,readDraft,saveDraft,queueSession,flushAutosave,listenAutosave,forgetSession} from '../lib/scoutAutosave';
/* eslint-disable */
import { useEffect, useLayoutEffect, useRef, useMemo, useState } from "react";
// PATCH: heatmap-v2
import CourtHeatmap from "./CourtHeatmap";
import CourtPositionMap from "./CourtPositionMap";
import { createMatchReport } from '../lib/matchReport';
import PrecisePosition from './PrecisePosition';
import PartialPerformance from './PartialPerformance';
import { calcStats, regularEnds as getRegularEnds, formatDuration, durationOf, positionLabel, playName, modeLabel, playsForAthlete, removeAndRenumber, participants, foundationAllowed } from '../lib/scoutData';
import { drawScorePartials } from "../lib/pdfPartials";
import { appendHeatmapReport } from "../lib/courtHeatmap";
import { supabase } from "../lib/supabase";
// PATCH: super-admin-delete-scout-v19
// PATCH: ui-review-v20
// PATCH: dashboard-training-v21
// PATCH: athlete-color-labels-v23
// PATCH: filters-evolution-data-v24
// PATCH: favorites-search-history-v25c
// PATCH: single-athlete-picker-v26
// PATCH: dashboard-training-compat-v20b
// PATCH: history-tb-v13
// PATCH: approved-only-selection-v15
// PATCH: own-pending-usable-v16
// PATCH: team-pairs-v12
// PATCH: newscout-list-filters-v11
// PATCH: shared-history-v10
// PATCH: athlete-permissions-v10
// PATCH: dashboard-gender-v9b
// PATCH: account-scope-v9a
// PATCH: tiebreak-v8
// PATCH: live-final-v5
// PATCH: live-names-history-v7
// PATCH: remove-end-history-v6
// PATCH: history-redblue-v4
// PATCH: athlete-selection-v3
/*
============================================================
BOCHA SCOUT
============================================================

FLUXO:

1. Cadastro da partida
2. Escolha da posição inicial da branca
3. Escolha da cor
4. Resultado
5. Fundamento
6. Volta para escolha da cor

EXCEÇÃO:

Se o fundamento for "Mover branca":
- abre novamente o mapa;
- escolhe nova posição;
- salva automaticamente como ACERTO;
- consome uma bola;
- volta para escolha da cor.

Quando as 12 bolas do End forem utilizadas:
- abre o placar do End;
- salva a parcial;
- inicia o próximo End;
- libera novamente as 6 bolas de cada cor;
- nova posição inicial da branca.

"Saída de jogo":
- só pode ser usada uma vez por End;
- volta a ficar disponível no próximo End.

"Falta":
- resultado automaticamente = ERRO.
*/

const GAME_TYPES = ["Individual", "Par BC3", "Par BC4", "Equipe BC1/BC2"];

const CLASSES = ["BC1", "BC2", "BC3", "BC4"];

const COLORS = ["Vermelho", "Azul"];
const GENDERS = ["Masculino", "Feminino"];

const PLAYS = [
  "Saída de jogo",
  "Aproximação",
  "Tirar bola da ZP",
  "Batida",
  "Aérea",
  "Mover branca",
  "Dobrar bola",
  "Pingo d'água",
  "Bola de defesa",
  "Tabela",
  "Sobrepor",
  "Empurrar bola na ZP",
  "Falta",
];

// Ordem de exibicao dos fundamentos na Etapa 4
const FOUNDATION_DISPLAY_ORDER = [
  "Saída de jogo",
  "Aproximação",
  "Batida",
  "Tirar bola da ZP",
  "Empurrar bola na ZP",
  "Mover branca",
  "Bola de defesa",
  "Tabela",
  "Aérea",
  "Dobrar bola",
  "Sobrepor",
  "Pingo d'água",
  "Falta",
];

function sortFoundations(plays) {
  const rank = (play) => {
    const index = FOUNDATION_DISPLAY_ORDER.indexOf(play);
    return index === -1 ? FOUNDATION_DISPLAY_ORDER.length : index;
  };
  return [...plays].sort((a, b) => rank(a) - rank(b));
}

const VISIBLE_FOUNDATIONS = 6;

function playAsset(play) {
  if (play === "Saída de jogo") return "/scout-assets/start.png";
  if (play === "Aproximação") return "/scout-assets/approach.png";
  if (play === "Batida") return "/scout-assets/hit.png";
  if (play === "Aérea") return "/scout-assets/aerial.png";
  if (play.includes("Tirar")) return "/scout-assets/remove.png";
  if (play === "Mover branca") return "/scout-assets/move-white.png";
  if (play === "Dobrar bola") return "/scout-assets/overlap.png";
  if (play === "Pingo d'água") return "/scout-assets/water.png";
  if (play === "Bola de defesa") return "/scout-assets/defense.png";
  if (play === "Tabela") return "/scout-assets/bank.png";
  if (play === "Sobrepor") return "/scout-assets/stack.png";
  if (play.includes("Empurrar")) return "/scout-assets/push-zone.png";
  if (play === "Falta") return "/scout-assets/foul.png";
  return "/scout-assets/zone.png";
}

const RESULTS = ["Acerto", "Funcional", "Erro"];

const POSITIONS = [
  null, null, "14", "13", null, null,
  "26", "25", "24", "23", "22", "21",
  "36", "35", "34", "33", "32", "31",
  "46", "45", "44", "43", "42", "41",
  "56", "55", "54", "53", "52", "51",
  "66", "65", "64", "63", "62", "61",
  "76", "75", "74", "73", "72", "71",
  "86", "85", "84", "83", "82", "81",
  "96", "95", "94", "93", "92", "91", "TB",
];

function buildPlayStats(plays) {
  const data = { Vermelho: {}, Azul: {} };

  plays.forEach((play) => {
    if (!data[play.color]) return;

    if (!data[play.color][play.play]) {
      data[play.color][play.play] = {
        total: 0,
        acertos: 0,
        funcionais: 0,
        erros: 0,
      };
    }

    const item = data[play.color][play.play];
    item.total++;
    if (play.result === "Acerto") item.acertos++;
    if (play.result === "Funcional") item.funcionais++;
    if (play.result === "Erro") item.erros++;
  });

  Object.keys(data).forEach((color) => {
    Object.keys(data[color]).forEach((play) => {
      const item = data[color][play];
      item.efficiency =
        item.total === 0
          ? 0
          : ((item.acertos + item.funcionais * 0.5) / item.total) * 100;
      item.accuracy = item.total === 0 ? 0 : (item.acertos / item.total) * 100;
      item.errorRate = item.total === 0 ? 0 : (item.erros / item.total) * 100;
    });
  });

  return data;
}

function buildHeatmap(plays) {
  const counts = {};

  plays.forEach((p) => {
    const pos = p.whitePositionTo || p.whitePositionFrom;
    if (!pos) return;
    counts[pos] = (counts[pos] || 0) + 1;
  });

  return counts;
}

function getAthletePlays(session) {
  const plays = session?.plays || [];
  if (!session?.athleteColor) return plays;
  return plays.filter((p) => p.color === session.athleteColor);
}

function aggregateAthleteFundaments(sessions) {
  const map = {};
  sessions.forEach((session) => {
    getAthletePlays(session).forEach((p) => {
      if (!map[p.play]) map[p.play] = { total: 0, acertos: 0, funcionais: 0, erros: 0 };
      const item = map[p.play];
      item.total += 1;
      if (p.result === "Acerto") item.acertos += 1;
      if (p.result === "Funcional") item.funcionais += 1;
      if (p.result === "Erro") item.erros += 1;
    });
  });
  Object.values(map).forEach((item) => {
    item.efficiency = item.total ? ((item.acertos + item.funcionais * 0.5) / item.total) * 100 : 0;
    item.accuracy = item.total ? (item.acertos / item.total) * 100 : 0;
    item.errorRate = item.total ? (item.erros / item.total) * 100 : 0;
  });
  return map;
}

function buildPositionPerformance(plays) {
  const map = {};
  plays.forEach((p) => {
    const pos = p.whitePositionTo || p.whitePositionFrom;
    if (!pos) return;
    if (!map[pos]) map[pos] = { total: 0, acertos: 0, funcionais: 0, erros: 0, saidas: 0 };
    const item = map[pos];
    if(p.play==='Mover branca' && p.result!=='Erro' && p.whitePositionFrom && p.whitePositionTo) {
      (item.movements ||= []).push({from:p.whitePositionFrom,to:p.whitePositionTo,fromPoint:p.whitePointFrom,toPoint:p.whitePointTo});
    }
    item.total += 1;
    if (p.result === "Acerto") item.acertos += 1;
    if (p.result === "Funcional") item.funcionais += 1;
    if (p.result === "Erro") item.erros += 1;
    if (p.play === "Saída de jogo") {
      item.saidas += 1;
      const point=p.whitePointTo || p.whitePointFrom;
      if(point) (item.points ||= []).push(point);
    }
  });
  Object.values(map).forEach((item) => {
    item.efficiency = item.total ? ((item.acertos + item.funcionais * 0.5) / item.total) * 100 : 0;
    item.accuracy = item.total ? (item.acertos / item.total) * 100 : 0;
    item.errorRate = item.total ? (item.erros / item.total) * 100 : 0;
  });
  return map;
}



const STORAGE_KEYS = {
  athletes: "bochaScout.athletes.v1",
  sessions: "bochaScout.sessions.v1",
};

function safeLoad(key, fallback = []) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function safeSave(key, value) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Mantém o scout funcionando mesmo se o armazenamento estiver bloqueado.
  }
}

function todayISO() {
  const now=new Date();return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
}

function formatDateBR(iso) {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  if (!y || !m || !d) return String(iso);
  return `${d}/${m}/${y}`;
}

function pdfFilePart(value, fallback = "sem-informacao") {
  return String(value || fallback)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || fallback;
}

function matchReportFileName(session) {
  const athletes = `${pdfFilePart(session.athlete, "atleta-vermelho")}_vs_${pdfFilePart(session.opponent, "atleta-azul")}`;
  const reference = session.sessionKind === "Campeonato" && session.competitionName?.trim()
    ? pdfFilePart(session.competitionName, "campeonato")
    : pdfFilePart(session.date || todayISO(), todayISO());
  return `BochaScout_${reference}_${athletes}.pdf`;
}


function AthleteCombobox({ items, value, onChange, query, setQuery, favoriteIds = [], onToggleFavorite, placeholder = "Buscar ou selecionar atleta...", allowAll = false }) {
  const [open, setOpen] = useState(false);
  const selected = value && value !== "Todos" ? items.find((item) => item.id === value) : null;

  function handleInput(e) {
    const next = e.target.value;
    setQuery(next);
    setOpen(true);
    if (selected && next !== selected.name) onChange(allowAll ? "Todos" : "");
    if (allowAll && !next.trim()) onChange("Todos");
  }

  function selectItem(item) {
    setQuery(item.name);
    onChange(item.id);
    setOpen(false);
  }

  return (
    <div style={{ position: "relative" }}>
      <div className="athlete-combobox-input">
        <MagnifyingGlass size={16} color="#94a3b8" aria-hidden="true" />
      <input
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...styles.input, paddingLeft: 36 }}
      />
      </div>
      {open && (
        <div style={{ position: "absolute", zIndex: 40, top: "calc(100% + 4px)", left: 0, right: 0, maxHeight: 250, overflowY: "auto", background: "white", border: "1px solid #cbd5e1", borderRadius: 10, boxShadow: "0 12px 28px rgba(15,23,42,.18)" }}>
          {allowAll && !query.trim() && (
            <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>{setQuery("");onChange("Todos");setOpen(false);}} style={{ width:"100%", textAlign:"left", padding:"11px 12px", border:0, borderBottom:"1px solid #e2e8f0", background:value==="Todos"?"#f1f5f9":"white", cursor:"pointer", fontWeight:800 }}>
              Todos os atletas
            </button>
          )}
          {items.length === 0 ? (
            <div style={{ padding: 12, color: "#64748b", fontSize: 13 }}>Nenhum atleta encontrado.</div>
          ) : items.map((item) => {
            const fav = favoriteIds.includes(item.id);
            return (
              <div key={item.id} style={{ display:"flex", alignItems:"center", borderBottom:"1px solid #e2e8f0", background:value===item.id?"#f8fafc":"white" }}>
                <button type="button" onMouseDown={(e)=>e.preventDefault()} onClick={()=>selectItem(item)} style={{ flex:1, border:0, background:"transparent", textAlign:"left", padding:"11px 10px 11px 12px", cursor:"pointer", minWidth:0 }}>
                  <div style={{ fontWeight:800, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</div>
                  {item.athleteClass && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{item.athleteClass}{item.gender ? " · " + item.gender : ""}</div>}
                </button>
                <button type="button" aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"} onMouseDown={(e)=>e.preventDefault()} onClick={(e)=>{e.stopPropagation();onToggleFavorite?.(item.id);}} style={{ border:0, background:"transparent", fontSize:24, lineHeight:1, padding:"9px 12px", cursor:"pointer", color:fav?"#ca8a04":"#94a3b8" }}>
                  <Star size={18} weight={fav ? "fill" : "regular"} aria-hidden="true" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopNav({ view, setView }) {
  if (view !== 'history' && view !== 'compare' && view !== 'my-matches') return null;
  return <HeaderNavigation>
    <nav className="home-section-nav" aria-label="Navegação de análises">
      {[["dashboard", "Início"], ["my-matches", "Minhas partidas"], ["history", "Histórico"], ["compare", "Comparar atletas"]].map(([id, label]) => (
        <button key={id} type="button" aria-current={view === id ? 'page' : undefined} onClick={() => {setView(id);window.scrollTo(0, 0);}}>{label}</button>
      ))}
    </nav>
  </HeaderNavigation>;
}
function getRegularScoreTotals(scores = {}) {
  return Object.entries(scores || {}).reduce(
    (acc, [name, score]) => {
      if (String(name).startsWith("Tie-Break")) return acc;
      acc.athlete += Number(score?.athlete || 0);
      acc.opponent += Number(score?.opponent || 0);
      return acc;
    },
    { athlete: 0, opponent: 0 }
  );
}

function getTieBreakWinnerFromScores(scores = {}) {
  const entries = Object.entries(scores || {})
    .filter(([name]) => String(name).startsWith("Tie-Break"));
  for (let i = entries.length - 1; i >= 0; i--) {
    const [, score] = entries[i];
    const a = Number(score?.athlete || 0);
    const o = Number(score?.opponent || 0);
    if (a > o) return "athlete";
    if (o > a) return "opponent";
  }
  return null;
}

function getSessionWinner(s) {
  const totals = getRegularScoreTotals(s?.scores || {});
  if (totals.athlete > totals.opponent) return "Vitória";
  if (totals.athlete < totals.opponent) return "Derrota";
  const tbWinner = getTieBreakWinnerFromScores(s?.scores || {});
  if (tbWinner === "athlete") return "Vitória";
  if (tbWinner === "opponent") return "Derrota";
  return "—";
}

function aggregateFundaments(sessions) {
  const map = {};
  sessions.forEach((session) => {
    (session.plays || []).forEach((p) => {
      if (!map[p.play]) map[p.play] = { total: 0, acertos: 0, funcionais: 0, erros: 0 };
      const item = map[p.play];
      item.total += 1;
      if (p.result === "Acerto") item.acertos += 1;
      if (p.result === "Funcional") item.funcionais += 1;
      if (p.result === "Erro") item.erros += 1;
    });
  });
  Object.values(map).forEach((item) => {
    item.efficiency = item.total ? ((item.acertos + item.funcionais * 0.5) / item.total) * 100 : 0;
    item.accuracy = item.total ? (item.acertos / item.total) * 100 : 0;
    item.errorRate = item.total ? (item.erros / item.total) * 100 : 0;
  });
  return map;
}

function TinyBar({ value, suffix = "%", max = 100 }) {
  const safe = Math.max(0, Math.min(max, Number(value || 0)));
  return (
    <div>
      <div style={{ height: 9, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${max ? (safe / max) * 100 : 0}%`, height: "100%", background: "#0f172a" }} />
      </div>
      <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>{Number(value || 0).toFixed(1)}{suffix}</div>
    </div>
  );
}

function FilterField({ label, icon: Icon, children }) {
  return (
    <div className="filter-field">
      <label className="filter-field__label">
        {Icon && <Icon size={16} weight="bold" aria-hidden="true" />}
        <span>{label}</span>
      </label>
      {children}
    </div>
  );
}

function FiltersPanel({ title, activeCount, onClear, children, moreOpen, onToggleMore }) {
  return (
    <section className="filter-panel">
      <div className="filter-panel__header">
        <h2 className="filter-panel__title">{title}</h2>
        <div className="filter-panel__meta">
          <span className="filter-badge" aria-label={`${activeCount} filtros ativos`}>{activeCount}</span>
          {activeCount > 0 && <button type="button" className="filter-clear" onClick={onClear}><X size={16} weight="bold" /> Limpar</button>}
        </div>
      </div>
      {children}
      {onToggleMore && <button type="button" className={`filter-more${moreOpen ? ' is-open' : ''}`} onClick={onToggleMore}>
        <span>{moreOpen ? "Ocultar filtros" : "Mais filtros"}</span>
        <CaretDown size={16} weight="bold" aria-hidden="true" />
      </button>}
    </section>
  );
}

function AthletesScreen({ athletes, sessions, onAdd, onDelete, onBack }) {
  const [search,setSearch]=useState('');
  const [filterClass,setFilterClass]=useState('Todos');
  const [filterGender,setFilterGender]=useState('Todos');
  const [limit,setLimit]=useState(20);
  const [expanded,setExpanded]=useState('');
  const filteredAthletes=athletes.filter(a=>(search.trim() || filterClass!=='Todos' || filterGender!=='Todos') && (!search.trim() || a.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))) && (filterClass==='Todos' || a.athleteClass===filterClass) && (filterGender==='Todos' || a.gender===filterGender));
  useEffect(()=>{setLimit(20);setExpanded('');},[search,filterClass,filterGender]);
  const [name, setName] = useState("");
  const [athleteClass, setAthleteClass] = useState("");
  const [observations, setObservations] = useState("");

  function submit(e) {
    e.preventDefault();
    if (!name.trim() || !athleteClass) {
      alert("Informe o nome e a classe do atleta.");
      return;
    }
    onAdd({
      id: `${Date.now()}-${Math.random()}`,
      name: name.trim(),
      athleteClass,
      observations: observations.trim(),
      createdAt: new Date().toISOString(),
    });
    setName("");
    setAthleteClass("");
    setObservations("");
  }

  return (
    <>
      <div style={styles.card}>
        <h2>Cadastro de atleta</h2>
        <p style={{ color: "#64748b", marginBottom: 0 }}>Use o botão <strong>Cadastrar atleta</strong> no topo do sistema. Contas comuns podem cadastrar atletas; edição e exclusão são exclusivas do administrador.</p>
      </div>

      <FiltersPanel
        title={`Atletas cadastrados (${athletes.length})`}
        activeCount={(search.trim() ? 1 : 0) + (filterClass !== "Todos" ? 1 : 0) + (filterGender !== "Todos" ? 1 : 0)}
        onClear={() => { setSearch(""); setFilterClass("Todos"); setFilterGender("Todos"); }}
      >
        <p>Consulte um atleta para ver as partidas registradas por esta conta.</p>
        <div className="filter-grid">
          <FilterField label="Buscar atleta" icon={MagnifyingGlass}><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Digite o nome" /></FilterField>
          <FilterField label="Classe" icon={Folders}><select value={filterClass} onChange={e=>setFilterClass(e.target.value)}><option>Todos</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></FilterField>
          <FilterField label="Gênero" icon={UsersThree}><select value={filterGender} onChange={e=>setFilterGender(e.target.value)}><option>Todos</option><option>Masculino</option><option>Feminino</option></select></FilterField>
        </div>
        {!search.trim() && filterClass==='Todos' && filterGender==='Todos' && <p>Use a busca ou um filtro para mostrar os atletas.</p>}
        {filteredAthletes.length === 0 ? (
          <p style={styles.empty}>Nenhum atleta para os filtros selecionados.</p>
        ) : filteredAthletes.slice(0,limit).map((a) => {
          const athleteSessions = sessions.filter((s) => s.athleteId === a.id || s.opponentId === a.id || (s.plays||[]).some(p=>p.playerId===a.id));
          const stats = calcStats(athleteSessions.flatMap((s) => playsForAthlete(s,a.id)));
          return (
            <div key={a.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <strong>{a.name}</strong>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{a.athleteClass} · {athleteSessions.length} partidas · {stats.total} jogadas analisadas</div>
                  {a.observations && <div style={{ fontSize: 12, color: "#475569", marginTop: 4 }}>{a.observations}</div>}
                </div>
              </div>
              {stats.total > 0 && <div style={{ marginTop: 8 }}><TinyBar value={stats.efficiency} /></div>}
              <button style={{...styles.button,marginTop:8,background:'#475569'}} onClick={()=>setExpanded(expanded===a.id?'':a.id)}>{expanded===a.id?'Ocultar partidas':'Ver minhas partidas'}</button>
              {expanded===a.id && (athleteSessions.length ? athleteSessions.map(s=><div key={s.id} style={{padding:'8px 0'}}>{formatDateBR(s.date)} · {s.athlete} × {s.opponent} · {s.sessionKind || s.kind || 'Scout'} · {(s.plays || []).length} jogadas</div>):<p>Esta conta ainda não registrou partidas deste atleta.</p>)}
            </div>
          );
        })}
        {filteredAthletes.length > limit && <button style={styles.button} onClick={()=>setLimit(limit+20)}>Mostrar mais atletas</button>}
      </FiltersPanel>
      {onBack && <button onClick={onBack} style={{ ...styles.button, background: "#475569", width: "100%" }}>Voltar</button>}
    </>
  );
}

function SessionDetail({ item, onClose, onExportPdf, selectedAthleteId }) {
  const selectedIsOpponent = selectedAthleteId && selectedAthleteId !== "Todos" && item.opponentId === selectedAthleteId;
  const targetColor = selectedIsOpponent
    ? (item.athleteColor === "Vermelho" ? "Azul" : "Vermelho")
    : item.athleteColor;
  const analyzedName = (item.plays||[]).find(p=>p.playerId===selectedAthleteId)?.playerName || (selectedIsOpponent ? item.opponent : item.athlete);
  const athletePlays = (item.plays || []).filter((p) => p.color === targetColor);
  const analysisItem = selectedIsOpponent ? {
    ...item,
    athlete: item.opponent,
    opponent: item.athlete,
    athleteId: item.opponentId,
    opponentId: item.athleteId,
    athleteColor: targetColor,
    totalAthlete: item.totalOpponent,
    totalOpponent: item.totalAthlete,
    scores: Object.fromEntries(Object.entries(item.scores || {}).map(([name, score]) => [name, { ...score, athlete: score.opponent, opponent: score.athlete }]))
  } : item;
  const fundamentals = aggregateAthleteFundaments([analysisItem]);
  const ranking = Object.entries(fundamentals).sort((a,b) => b[1].total - a[1].total);
  const redName = item.athleteColor === "Vermelho" ? item.athlete : item.opponent;
  const blueName = item.athleteColor === "Azul" ? item.athlete : item.opponent;
  const matchSides = matchSeries(item).map((side) => {
    const stats = calcStats(side.plays);
    const map = {};
    side.plays.forEach((p) => {
      if (!map[p.play]) map[p.play] = { total: 0, acertos: 0, funcionais: 0, erros: 0 };
      map[p.play].total += 1;
      if (p.result === "Acerto") map[p.play].acertos += 1;
      if (p.result === "Funcional") map[p.play].funcionais += 1;
      if (p.result === "Erro") map[p.play].erros += 1;
    });
    Object.values(map).forEach((d) => { d.efficiency = d.total ? ((d.acertos + d.funcionais * .5) / d.total) * 100 : 0; });
    return { ...side, stats, ranking: Object.entries(map).sort((a,b) => b[1].total - a[1].total) };
  });

  return (
    <div style={styles.card}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Detalhes da sessão</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => onExportPdf?.(analysisItem)} style={{ ...styles.button, background: "#16a34a", padding: "8px 11px" }}>PDF desta partida</button>
          <button onClick={onClose} style={{ ...styles.button, background: "#475569", padding: "8px 11px" }}>Fechar</button>
        </div>
      </div>
      <h3>{item.athlete} × {item.opponent}</h3>
      <div style={{ fontSize: 13, color: "#475569", fontWeight: 700 }}>Analisando: {analyzedName}</div>
      <p style={{ color: "#64748b" }}>
        {formatDateBR(item.date)} · {item.sessionKind} · {item.gameType} · {modeLabel(item)}
        {item.competitionName ? ` · ${item.competitionName}` : ""}{item.competitionPhase ? ` · ${item.competitionPhase}` : ""}
      </p>
      <div style={styles.miniStats}>
        <MiniStat label="Placar" value={`${item.totalAthlete} × ${item.totalOpponent}`} />
        <MiniStat label="Jogadas" value={item.stats?.total ?? 0} />
        <MiniStat label="Eficiência" value={`${Number(item.stats?.efficiency || 0).toFixed(1)}%`} />
        <MiniStat label="Resultado" value={getSessionWinner(item)} />
      </div>

      <PartialPerformance plays={item.plays||[]} gameType={item.gameType} athlete={item.athlete} opponent={item.opponent} athleteColor={item.athleteColor} scoutMode={item.scoutMode} isHistory/>
      <FoundationRadar series={matchSeries(item)} gameType={item.gameType}/>
      <h3 style={{ marginTop: 20 }}>Análise dos dois lados</h3>
      <div className="session-athlete-comparison">
        {matchSides.map((side) => (
          <section key={side.color} className={`session-athlete-side is-${side.color.toLowerCase()}`}>
            <div className="session-athlete-heading"><span>{side.color}</span><strong>{side.name}</strong></div>
            <div className="session-athlete-metrics"><MiniStat label="Jogadas" value={side.stats.total}/><MiniStat label="Eficiência" value={`${side.stats.efficiency.toFixed(1)}%`}/><MiniStat label="Erros" value={side.stats.erros}/></div>
            <h4>Mapa de calor</h4>
            <HistoricalHeatmap plays={side.plays} name={side.name} color={side.color}/>
          </section>
        ))}
      </div>

      <h3 style={{ marginTop: 20 }}>Placar por End</h3>
      {Object.keys(item.scores || {}).length === 0 ? <p style={styles.empty}>Sem placar por End salvo.</p> : Object.entries(item.scores || {}).map(([name, s]) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
          <span>{name}</span><strong>{s.athlete} × {s.opponent}</strong><span>{item.athlete}: {calcStats((item.plays||[]).filter(p=>p.end===name&&p.color===item.athleteColor)).efficiency.toFixed(1)}% · {item.opponent}: {calcStats((item.plays||[]).filter(p=>p.end===name&&p.color!==item.athleteColor)).efficiency.toFixed(1)}%</span>
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Jogadas da partida</h3>
      {(item.plays || []).map((p, idx) => (
        <div key={p.id || idx} style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
          <strong>{p.end} · {p.ball}</strong> · {playName(item,p)} · {p.color} · {p.play} · {p.result} · branca {positionLabel(p)} · Tempo: {formatDuration(durationOf(p))}
        </div>
      ))}
    </div>
  );
}

export function HistoricalHeatmap({ plays, sessions = [], playsForSession, name = "", color = "" }) {
  const [mode, setMode] = useState("Desempenho");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [mapColor, setMapColor] = useState("Todas");
  const actualColors = [...new Set(plays.map(p => p.color))];
  const displayColor = mapColor !== "Todas" ? mapColor : color || (actualColors.length === 1 ? actualColors[0] : "Todas");

  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const modePlays = useMemo(() => {
    if (mode === "Aproximação") return filteredPlays.filter((p) => p.play === "Aproximação");
    if (mode === "Batida") return filteredPlays.filter((p) => p.play === "Batida");
    return filteredPlays;
  }, [filteredPlays, mode]);
  const positionData = useMemo(() => buildPositionPerformance(modePlays), [modePlays]);

  const detail = selectedPosition ? positionData[selectedPosition] : null;
  const evolution = useMemo(() => {
    return [...sessions].sort((a,b) => String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || ""))).map((session) => {
      let pp = playsForSession ? playsForSession(session) : (session.plays || []);
      if (mapColor !== "Todas") pp = pp.filter((p) => p.color === mapColor);
      if (mode === "Saídas de jogo") pp = pp.filter((p) => p.play === "Saída de jogo");
      if (mode === "Aproximação") pp = pp.filter((p) => p.play === "Aproximação");
      if (mode === "Batida") pp = pp.filter((p) => p.play === "Batida");
      if (selectedPosition) pp = pp.filter((p) => (p.whitePositionTo || p.whitePositionFrom) === selectedPosition);
      const st = calcStats(pp);
      let value = st.efficiency;
      if (mode === "Acertos") value = st.accuracy;
      if (mode === "Erros") value = st.errorRate;
      if (mode === "Volume") value = pp.length;
      if (mode === "Saídas de jogo") value = pp.length;
      return { id: session.id, label: formatDateBR(session.date), value, total: pp.length };
    }).filter((x) => x.total > 0);
  }, [sessions, playsForSession, mapColor, mode, selectedPosition]);
  const maxEvolution = Math.max(1, ...evolution.map((x) => x.value));

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".04em" }}>Cor analisada</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Todas", "Vermelho", "Azul"].map((color) => (
            <button key={color} onClick={() => { setMapColor(color); setSelectedPosition(""); }} style={{ ...styles.button, padding: "9px 14px", background: mapColor === color ? (color === "Vermelho" ? "#b91c1c" : color === "Azul" ? "#1d4ed8" : "#0f172a") : "#64748b", fontSize: 12 }}>{color}</button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 7, textTransform: "uppercase", letterSpacing: ".04em" }}>Modo do mapa</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {["Desempenho", "Saídas de jogo", "Volume", "Aproximação", "Batida"].map((item) => (
          <button key={item} onClick={() => { setMode(item); setSelectedPosition(""); }} style={{ ...styles.button, padding: "9px 11px", background: mode === item ? "#0f172a" : "#64748b", fontSize: 12 }}>{item}</button>
        ))}
      </div>
      <CourtHeatmap data={positionData} mode={mode} color={displayColor} name={name} selected={selectedPosition} onSelect={(position) => setSelectedPosition(current => current === position ? "" : position)} />
      {detail && <div style={{ ...styles.info, marginTop: 12 }}>
        <strong>Posição {selectedPosition}</strong> · {mode === "Saídas de jogo" ? `${detail.saidas} saída(s)` : `${detail.total} jogadas · ${detail.acertos} acertos · ${detail.funcionais} funcionais · ${detail.erros} erros · ${detail.efficiency.toFixed(1)}% eficiência`}
      </div>}
      <EvolutionLineChart
        data={evolution}
        title={`Evolução · ${selectedPosition ? `Posição ${selectedPosition}` : "Todas as posições"}`}
        countMode={mode === "Volume" || mode === "Saídas de jogo"}
        maxValue={maxEvolution}
      />
    </div>
  );
}

function EvolutionLineChart({ data, title, countMode, maxValue }) {
  const width = Math.max(320, data.length * 76 + 70);
  const height = 230;
  const pad = { left: 42, right: 24, top: 30, bottom: 42 };
  const ceiling = countMode ? Math.max(1, maxValue) : 100;
  const points = data.map((point, index) => {
    const x = data.length === 1 ? width / 2 : pad.left + index * ((width - pad.left - pad.right) / Math.max(1, data.length - 1));
    const y = pad.top + (1 - Math.min(ceiling, point.value) / ceiling) * (height - pad.top - pad.bottom);
    return { ...point, x, y };
  });
  return <div className="history-evolution-chart">
    <h3>{title}</h3>
    <p>O gráfico acompanha a cor, o modo e a posição escolhidos no mapa de calor.</p>
    {data.length === 0 ? <div style={styles.empty}>Sem partidas com dados para esta seleção.</div> : <div className="history-evolution-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} style={{width,maxWidth:'none'}} height={height} role="img" aria-label={title}>
        {[0, .25, .5, .75, 1].map((ratio) => {
          const y = pad.top + ratio * (height - pad.top - pad.bottom);
          const value = ceiling * (1 - ratio);
          return <g key={ratio}><line x1={pad.left} x2={width-pad.right} y1={y} y2={y} stroke="#dbe4ee" strokeWidth="1"/><text x={pad.left-8} y={y+4} textAnchor="end" fontSize="10" fill="#64748b">{countMode ? value.toFixed(0) : `${value.toFixed(0)}%`}</text></g>;
        })}
        <polyline points={points.map((p)=>`${p.x},${p.y}`).join(" ")} fill="none" stroke="#1673e8" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
        {points.map((p)=><g key={p.id}><circle cx={p.x} cy={p.y} r="6" fill="#fff" stroke="#1673e8" strokeWidth="4"/><text x={p.x} y={p.y-13} textAnchor="middle" fontSize="10" fontWeight="800" fill="#09264b">{countMode ? p.value.toFixed(0) : `${p.value.toFixed(0)}%`}</text><text x={p.x} y={height-14} textAnchor="middle" fontSize="10" fill="#64748b">{p.label}</text></g>)}
      </svg>
    </div>}
  </div>;
}

function HistoryScreen({ sessions, athletes, onBack, onDeleted, isAdmin = false, isSuperAdmin = false, ownerAccounts = [], favoriteAthleteIds = [], onToggleFavorite }) {
  const [accountFilter, setAccountFilter] = useState("Todos");
  const [kind, setKind] = useState("Todos");
  const [athleteFilter, setAthleteFilter] = useState("Todos");
  const [gameFilter, setGameFilter] = useState("Todos");
  const [period, setPeriod] = useState("Tudo");
  const [colorFilter, setColorFilter] = useState("Todos");
  const [historyAthleteSearch, setHistoryAthleteSearch] = useState("");
  const [historyClassFilter, setHistoryClassFilter] = useState("Todos");
  const [historyGenderFilter, setHistoryGenderFilter] = useState("Todos");
  const [historyLevelFilter, setHistoryLevelFilter] = useState("Todos");
  const [showMoreHistoryFilters, setShowMoreHistoryFilters] = useState(false);
  const activeHistoryFilters = (isAdmin && accountFilter !== "Todos" ? 1 : 0)
    + (athleteFilter !== "Todos" ? 1 : 0)
    + (period !== "Tudo" ? 1 : 0)
    + (kind !== "Todos" ? 1 : 0)
    + (historyClassFilter !== "Todos" ? 1 : 0)
    + (historyGenderFilter !== "Todos" ? 1 : 0)
    + (gameFilter !== "Todos" ? 1 : 0);
  const athletesWithHistory = useMemo(() => {
    const ids = new Set();
    const names = new Set();
    sessions.forEach((session) => {
      if (accountFilter !== 'Todos' && session.ownerUserId !== accountFilter) return;
      if ((session.plays || []).some(p=>p.color===session.athleteColor)) {if(session.athleteId) ids.add(session.athleteId);else if(session.athlete) names.add(String(session.athlete).trim().toLocaleLowerCase('pt-BR'));}
      if ((session.plays || []).some(p=>p.color!==session.athleteColor && ['Azul','Vermelho'].includes(p.color))) {if(session.opponentId) ids.add(session.opponentId);else if(session.opponent) names.add(String(session.opponent).trim().toLocaleLowerCase('pt-BR'));}
    });
    return { ids, names };
  }, [sessions,accountFilter]);
  const historyAthletes = useMemo(() => athletes.filter((a) => {
    const hasHistory = athletesWithHistory.ids.has(a.id) || athletesWithHistory.names.has(String(a.name || "").trim().toLocaleLowerCase("pt-BR"));
    const classOk = historyClassFilter === "Todos" || a.athleteClass === historyClassFilter;
    const genderOk = historyGenderFilter === "Todos" || a.gender === historyGenderFilter;
    const nameOk = !historyAthleteSearch.trim() || a.name.toLocaleLowerCase("pt-BR").startsWith(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"));
    return hasHistory && classOk && genderOk && nameOk;
  }).sort((a,b) => Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id)) || a.name.localeCompare(b.name,"pt-BR")), [athletes, athletesWithHistory, historyClassFilter, historyGenderFilter, historyAthleteSearch, favoriteAthleteIds]);

  async function exportSavedSessionReportLegacy(item) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const M = 40;
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    let y = 48;
    const athletePlays = getAthletePlays(item);
    const st = calcStats(athletePlays);
    const f = aggregateAthleteFundaments([item]);
    const positions = buildPositionPerformance(athletePlays);
    const bestPos = Object.entries(positions).sort((a,b) => b[1].efficiency - a[1].efficiency || b[1].total-a[1].total)[0];
    const attentionPos = Object.entries(positions).sort((a,b) => b[1].errorRate - a[1].errorRate || b[1].total-a[1].total)[0];
    const exits = {}; athletePlays.filter(p=>p.play === "Saída de jogo").forEach(p=>{ const pos=p.whitePositionFrom||p.whitePositionTo; if(pos&&pos!=="TB") exits[pos]=(exits[pos]||0)+1; });
    const topExit = Object.entries(exits).sort((a,b)=>b[1]-a[1])[0];

    function ensure(h=18){ if(y+h>H-40){ doc.addPage(); y=48; } }
    function title(t){ ensure(34); doc.setFillColor(15,23,42); doc.roundedRect(M,y-16,W-M*2,24,4,4,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text(t,M+8,y); y+=28; doc.setTextColor(30,41,59); doc.setFont("helvetica","normal"); doc.setFontSize(10); }
    function line(t,b=false){ ensure(); doc.setFont("helvetica",b?"bold":"normal"); doc.text(String(t),M,y); y+=15; }

    doc.setFillColor(15,23,42); doc.rect(0,0,W,82,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.text("BOCHA SCOUT",M,38); doc.setFontSize(11); doc.text("Relatório técnico da partida",M,58); y=112; doc.setTextColor(30,41,59);
    title("DADOS DA PARTIDA");
    line(`${item.athlete} (${item.athleteColor}) x ${item.opponent}` , true);
    line(`${formatDateBR(item.date)} · ${item.sessionKind} · ${item.gameType}`);
    if(item.competitionName) line(`Campeonato: ${item.competitionName}`);
    if(item.competitionPhase) line(`Fase: ${item.competitionPhase}`);
    if(item.athleteClass) line(`Classe: ${item.athleteClass}`);
    line(`Placar final: ${item.totalAthlete} x ${item.totalOpponent} · ${getSessionWinner(item)}`, true); y+=6;

    title("ANÁLISE DO ATLETA NESTA PARTIDA");
    line(`Jogadas: ${st.total} · Acertos: ${st.acertos} · Funcionais: ${st.funcionais} · Erros: ${st.erros}`);
    line(`Precisão: ${st.accuracy.toFixed(1)}% · Eficiência: ${st.efficiency.toFixed(1)}%`);
    line(`Melhor posição: ${bestPos ? `${bestPos[0]} (${bestPos[1].efficiency.toFixed(1)}%)` : "—"}`);
    line(`Posição de atenção: ${attentionPos ? `${attentionPos[0]} (${attentionPos[1].errorRate.toFixed(1)}% erro)` : "—"}`);
    line(`Saída mais utilizada: ${topExit ? `${topExit[0]} (${topExit[1]}x)` : "—"}`); y+=6;

    title("FUNDAMENTOS DO ATLETA");
    const fr = Object.entries(f).sort((a,b)=>b[1].efficiency-a[1].efficiency);
    if(!fr.length) line("Sem fundamentos registrados.");
    fr.forEach(([name,d])=> line(`${name}: ${d.total}x · ${d.efficiency.toFixed(1)}% eficiência · ${d.errorRate.toFixed(1)}% erro`));
    y+=6;

    title("PLACAR POR END");
    Object.entries(item.scores||{}).forEach(([name,sc])=>line(`${name}: ${sc.athlete} x ${sc.opponent}`));
    y+=6;

    title("JOGADAS DO ATLETA");
    athletePlays.forEach((p,i)=> line(`#${i+1} ${p.end} · ${p.ball} · ${p.play} · ${p.result} · posição ${p.whitePositionFrom}${p.whitePositionTo && p.whitePositionTo!==p.whitePositionFrom ? ` > ${p.whitePositionTo}` : ""}`));
    if(!athletePlays.length) line("Nenhuma jogada do atleta registrada.");

    doc.save(matchReportFileName(item));
  }

  const cutoff = useMemo(() => {
    if (period === "Tudo") return null;
    const days = period === "30 dias" ? 30 : period === "3 meses" ? 90 : period === "6 meses" ? 180 : 365;
    const d = new Date(); d.setDate(d.getDate() - days); return d;
  }, [period]);
  // No histórico não existe uma categoria separada de "adversário": todos são atletas cadastrados.
  // Ao selecionar um atleta, entram todas as partidas em que ele apareceu, seja como atleta principal ou como adversário.
  function athleteRole(session) {
    if (athleteFilter === "Todos") return "principal";
    if (session.athleteId === athleteFilter) return "principal";
    if (session.opponentId === athleteFilter) return "adversario";
    const member=(session.plays||[]).find(p=>p.playerId===athleteFilter);
    if(member)return member.color===session.athleteColor?'principal':'adversario';
    return null;
  }
  function colorForSelectedAthlete(session) {
    const role = athleteRole(session);
    if (role === "adversario") return session.athleteColor === "Vermelho" ? "Azul" : "Vermelho";
    return session.athleteColor;
  }
  function playsForSelectedAthlete(session) { return playsForAthlete(session,athleteFilter); }
  function resultForSelectedAthlete(session) {
    const base = getSessionWinner(session);
    if (athleteRole(session) !== "adversario") return base;
    if (base === "Vitória") return "Derrota";
    if (base === "Derrota") return "Vitória";
    return base;
  }

  const filtered = sessions.filter((s) => {
    const accountOk = !isAdmin || accountFilter === "Todos" || s.ownerUserId === accountFilter;
    const dateOk = !cutoff || new Date(`${s.date}T12:00:00`) >= cutoff;
    const athleteOk = athleteFilter === "Todos" || s.athleteId === athleteFilter || s.opponentId === athleteFilter || (s.plays||[]).some(p=>p.playerId===athleteFilter);
    const selectedColor = colorForSelectedAthlete(s);
    const role = athleteRole(s);
    const roleClass = athletes.find(a=>a.id===athleteFilter)?.athleteClass || (role === "adversario" ? s.opponentClass : s.athleteClass);
    const athleteGenderValue = s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender || "";
    const opponentGenderValue = s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender || "";
    const roleGender = athletes.find(a=>a.id===athleteFilter)?.gender || (role === "adversario" ? opponentGenderValue : athleteGenderValue);
    const classOk = historyClassFilter === "Todos" || (athleteFilter === "Todos" ? s.athleteClass === historyClassFilter || s.opponentClass === historyClassFilter : roleClass === historyClassFilter);
    const genderOk = historyGenderFilter === "Todos" || (athleteFilter === "Todos" ? athleteGenderValue === historyGenderFilter || opponentGenderValue === historyGenderFilter : roleGender === historyGenderFilter);
    const levelOk = historyLevelFilter === "Todos" || (s.sessionKind === "Campeonato" && s.competitionLevel === historyLevelFilter);
    return accountOk && (kind === "Todos" || s.sessionKind === kind) && athleteOk && classOk && genderOk && levelOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;
  });
  // O mapa e as métricas analisam somente as jogadas do atleta selecionado, independentemente
  // de ele ter sido cadastrado como atleta principal ou adversário naquela partida.
  const plays = filtered.flatMap((s) => playsForSelectedAthlete(s));
  const combined = calcStats(plays);
  const wins = filtered.filter(s => resultForSelectedAthlete(s) === "Vitória").length;
  const losses = filtered.filter(s => resultForSelectedAthlete(s) === "Derrota").length;
  const winRate = filtered.length ? wins / filtered.length * 100 : 0;
  const fundamentals = {};
  plays.forEach((p) => {
    if (!fundamentals[p.play]) fundamentals[p.play] = { total: 0, acertos: 0, funcionais: 0, erros: 0 };
    const item = fundamentals[p.play];
    item.total += 1;
    if (p.result === "Acerto") item.acertos += 1;
    if (p.result === "Funcional") item.funcionais += 1;
    if (p.result === "Erro") item.erros += 1;
  });
  Object.values(fundamentals).forEach((item) => {
    item.efficiency = item.total ? ((item.acertos + item.funcionais * 0.5) / item.total) * 100 : 0;
    item.errorRate = item.total ? (item.erros / item.total) * 100 : 0;
  });
  const best = Object.entries(fundamentals).sort((a,b) => b[1].efficiency - a[1].efficiency)[0];
  const worst = Object.entries(fundamentals).sort((a,b) => b[1].errorRate - a[1].errorRate)[0];
  const colorStats = ["Vermelho","Azul"].map(color => {
    const ss = filtered.filter(s => colorForSelectedAthlete(s) === color);
    const pp = ss.flatMap(s => playsForSelectedAthlete(s));
    return { color, sessions:ss.length, wins:ss.filter(s=>resultForSelectedAthlete(s)==="Vitória").length, stats:calcStats(pp) };
  });
  const exitCounts = {}; plays.filter(p=>p.play==="Saída de jogo").forEach(p=>{const pos=p.whitePositionFrom||p.whitePositionTo;if(pos&&pos!=="TB") exitCounts[pos]=(exitCounts[pos]||0)+1;});
  const topExit = Object.entries(exitCounts).sort((a,b)=>b[1]-a[1])[0];
  const positionPerformance = buildPositionPerformance(plays);
  const positionEntries = Object.entries(positionPerformance).filter(([,d]) => d.total > 0);
  const bestPosition = [...positionEntries].sort((a,b) => b[1].efficiency - a[1].efficiency || b[1].total - a[1].total)[0];
  const attentionPosition = [...positionEntries].sort((a,b) => b[1].errorRate - a[1].errorRate || b[1].total - a[1].total)[0];

  return <>
    <FiltersPanel
      title="Histórico do atleta"
      activeCount={activeHistoryFilters}
      onClear={() => {
        setAccountFilter("Todos"); setKind("Todos"); setAthleteFilter("Todos"); setGameFilter("Todos");
        setPeriod("Tudo"); setColorFilter("Todos"); setHistoryAthleteSearch(""); setHistoryClassFilter("Todos");
        setHistoryGenderFilter("Todos"); setHistoryLevelFilter("Todos"); setShowMoreHistoryFilters(false);
      }}
      moreOpen={showMoreHistoryFilters}
      onToggleMore={() => setShowMoreHistoryFilters((value) => !value)}
    >
      <div className="filter-grid">
        {isAdmin && <FilterField label="Conta" icon={Buildings}><select value={accountFilter} onChange={e=>{setAccountFilter(e.target.value);setAthleteFilter("Todos");}}><option value="Todos">Todas as contas</option>{ownerAccounts.map(a=><option key={a.id} value={a.id}>{a.name || a.username || a.id}</option>)}</select></FilterField>}
        <FilterField label="Atleta" icon={User}><AthleteCombobox
          items={historyAthletes}
          value={athleteFilter}
          onChange={setAthleteFilter}
          query={historyAthleteSearch}
          setQuery={setHistoryAthleteSearch}
          favoriteIds={favoriteAthleteIds}
          onToggleFavorite={onToggleFavorite}
          placeholder="Digite ou role os atletas"
          allowAll
        /></FilterField>
        <FilterField label="Período" icon={CalendarBlank}><select value={period} onChange={e=>setPeriod(e.target.value)}><option>Tudo</option><option>30 dias</option><option>3 meses</option><option>6 meses</option><option>12 meses</option></select></FilterField>
        <FilterField label="Tipo" icon={Trophy}><select value={kind} onChange={e=>setKind(e.target.value)}><option>Todos</option><option>Treino</option><option>Campeonato</option></select></FilterField>
      </div>
      {showMoreHistoryFilters && <div className="filter-grid" style={{ marginTop: 12 }}>
        <FilterField label="Classe" icon={Folders}><select value={historyClassFilter} onChange={e=>{setHistoryClassFilter(e.target.value);setAthleteFilter("Todos");}}><option>Todos</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></FilterField>
        <FilterField label="Gênero" icon={UsersThree}><select value={historyGenderFilter} onChange={e=>setHistoryGenderFilter(e.target.value)}><option>Todos</option>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></FilterField>
        <FilterField label="Tipo de jogo" icon={Trophy}><select value={gameFilter} onChange={e=>setGameFilter(e.target.value)}><option>Todos</option>{GAME_TYPES.map(g=><option key={g}>{g}</option>)}</select></FilterField>
      </div>}
    </FiltersPanel>

    <div style={styles.card}><div style={styles.miniStats}><MiniStat label="Partidas" value={filtered.length}/><MiniStat label="Vitórias" value={wins}/><MiniStat label="Derrotas" value={losses}/><MiniStat label="Aproveitamento" value={`${winRate.toFixed(1)}%`}/></div></div>

    <AthleteComparison sessions={sessions.filter(s=>accountFilter==='Todos'||s.ownerUserId===accountFilter)}/>
    <FoundationRadar series={[{name:athletes.find(a=>a.id===athleteFilter)?.name || 'Atletas principais · filtros atuais',color:'Roxo',plays}]}/>
    <div style={styles.card}><h2>Mapa de calor</h2><p style={styles.helpText}>Este mapa analisa somente as jogadas do atleta selecionado, em todas as partidas em que ele participou. Toque em uma posição para ver os detalhes.</p><HistoricalHeatmap plays={plays} sessions={filtered} playsForSession={playsForSelectedAthlete}/>
      {(() => {
        const tbPlays = plays.filter((p) => (p.whitePositionTo || p.whitePositionFrom) === "TB");
        if (tbPlays.length === 0) return null;
        const tbStats = calcStats(tbPlays);
        return (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f1f5f9", border: "1px solid #cbd5e1" }}>
            <strong>Ponto TB</strong> · {tbPlays.length} jogada(s) · {tbStats.efficiency.toFixed(1)}% eficiência
          </div>
        );
      })()}</div>

    <div style={styles.grid2}>
      <div style={styles.card}><h3>Desempenho por cor</h3>{colorStats.map(c=><div key={c.color} style={{padding:"10px 0",borderBottom:"1px solid #e2e8f0"}}><strong>{c.color}</strong><div>{c.stats.efficiency.toFixed(1)}% eficiência · {c.wins}/{c.sessions} vitórias</div></div>)}</div>
      <div style={styles.card}><h3>Saída mais utilizada</h3><div style={{fontSize:32,fontWeight:900,color:"#15803d"}}>{topExit ? topExit[0] : "—"}</div><div>{topExit ? `${topExit[1]} saídas registradas` : "Sem saídas registradas"}</div></div>
      <div style={styles.card}><h3>Melhor posição</h3><div style={{fontSize:32,fontWeight:900,color:"#15803d"}}>{bestPosition ? bestPosition[0] : "—"}</div><div>{bestPosition ? `${bestPosition[1].efficiency.toFixed(1)}% eficiência · ${bestPosition[1].total} jogadas` : "Sem dados"}</div></div>
      <div style={styles.card}><h3>Posição de atenção</h3><div style={{fontSize:32,fontWeight:900,color:"#b91c1c"}}>{attentionPosition ? attentionPosition[0] : "—"}</div><div>{attentionPosition ? `${attentionPosition[1].errorRate.toFixed(1)}% de erro · ${attentionPosition[1].total} jogadas` : "Sem dados"}</div></div>
    </div>

    <button onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>
  </>;
}

function MyMatchesScreen({ sessions, onBack, onDeleted, isAdmin = false, isSuperAdmin = false, ownerAccounts = [] }) {
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [accountFilter, setAccountFilter] = useState("Todos");
  const detailRef = useRef<HTMLDivElement>(null);
  const availableSessions = Array.isArray(sessions) ? sessions : [];
  const filteredSessions = useMemo(
    () => isSuperAdmin && accountFilter !== "Todos"
      ? availableSessions.filter((session) => session.ownerUserId === accountFilter)
      : availableSessions,
    [availableSessions, accountFilter, isSuperAdmin],
  );
  const selected = filteredSessions.find((s) => s.id === selectedSessionId);

  useEffect(() => {
    if (selected && detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }, [selected]);

  async function deleteScout(item) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Excluir definitivamente o Scout de ${item.athlete} × ${item.opponent}? Esta ação remove o Scout do banco de dados.`)) return;
    const { error } = await supabase.rpc("super_admin_delete_scout", { target_scout_id: item.id });
    if (error) {
      alert(error.message || "Não foi possível excluir o Scout.");
      return;
    }
    if (selectedSessionId === item.id) setSelectedSessionId("");
    forgetSession(item.id);
    onDeleted?.(item.id);
  }

  async function exportSavedSessionReport(item) {
    const doc = await createMatchReport({
      ...item,
      ownerDisplay: item.ownerDisplay || ownerAccounts.find((a) => a.id === item.ownerUserId)?.name,
    }, buildPositionPerformance);
    doc.save(matchReportFileName(item));
  }

  if (selected) {
    return <SessionDetail item={selected} onClose={() => { setSelectedSessionId(""); window.scrollTo(0,0); }} onExportPdf={exportSavedSessionReport} />;
  }

  return <>
    <div style={styles.card}>
      <h2>Minhas partidas</h2>
      {isSuperAdmin && <FilterField label="Conta" icon={Buildings}>
        <select value={accountFilter} onChange={(event) => {
          setAccountFilter(event.target.value);
          setSelectedSessionId("");
        }}>
          <option value="Todos">Todas as contas</option>
          {ownerAccounts.map((account) => (
            <option key={account.id} value={account.id}>{account.name || account.username || account.id}</option>
          ))}
        </select>
      </FilterField>}
      {filteredSessions.length === 0 ? <p style={styles.empty}>Nenhuma partida registrada.</p> : filteredSessions.map((item) => (
        <div key={item.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
            <div>
              <strong>{item.athlete} × {item.opponent}</strong>
              <div style={{fontSize:13,color:"#64748b"}}>
                {formatDateBR(item.date)} · {item.sessionKind} · {item.gameType} · {modeLabel(item)} · {item.athleteColor}
                {isAdmin && <span> · Criado por: {item.ownerDisplay || ownerAccounts.find((a) => a.id === item.ownerUserId)?.name || ownerAccounts.find((a) => a.id === item.ownerUserId)?.username || "Conta"}</span>}
              </div>
            </div>
            <strong style={{fontSize:20}}>{item.totalAthlete} × {item.totalOpponent}</strong>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            <button onClick={() => { setSelectedSessionId(item.id); window.scrollTo(0,0); }} style={{...styles.button,background:"#2563eb",padding:"9px 12px"}}>Ver análise completa</button>
            {isSuperAdmin && <button onClick={() => deleteScout(item)} style={{...styles.button,background:"#b91c1c",padding:"9px 12px"}}>Excluir Scout</button>}
          </div>
        </div>
      ))}
    </div>
    <button className="my-matches-back" onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>
  </>;
}

function DataScreen({ athletes, sessions, onImport, onClear, onBack }) {
  function exportData() {
    const payload = {
      app: "Bocha Scout",
      version: 2,
      exportedAt: new Date().toISOString(),
      athletes,
      sessions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BochaScout_backup_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (!Array.isArray(data.athletes) || !Array.isArray(data.sessions)) throw new Error();
        onImport(data);
        alert("Backup importado com sucesso.");
      } catch {
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <>
      <div style={styles.card}>
        <h2>Dados e backup</h2>
        <p style={{ color: "#64748b" }}>
          Esta versão salva os dados neste navegador. Use o backup para levar seus testes para outro computador ou celular.
        </p>
        <div style={styles.miniStats}>
          <MiniStat label="Atletas" value={athletes.length} />
          <MiniStat label="Sessões" value={sessions.length} />
          <MiniStat label="Jogadas" value={sessions.reduce((s,x) => s + (x.plays || []).length, 0)} />
        </div>
        <button onClick={exportData} style={{ ...styles.button, ...styles.green, width: "100%", marginTop: 15 }}>Exportar backup JSON</button>
        <label style={{ ...styles.button, background: "#2563eb", width: "100%", marginTop: 10, display: "block", textAlign: "center", cursor: "pointer" }}>
          Importar backup
          <input type="file" accept=".json,application/json" onChange={importFile} style={{ display: "none" }} />
        </label>
        <button onClick={onClear} style={{ ...styles.button, background: "#dc2626", width: "100%", marginTop: 10 }}>Apagar todos os dados locais</button>
      </div>
      {onBack && <button onClick={onBack} style={{ ...styles.button, background: "#475569", width: "100%" }}>Voltar</button>}
    </>
  );
}

export default function BochaScout() {
  const dataHost=useContext(DataPanelContext);
  // =========================================================
  // CADASTRO
  // =========================================================

  const [view, setView] = useState("dashboard");
  const [sessionKind, setSessionKind] = useState("Treino");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionPhase, setCompetitionPhase] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState("Nacional");
  const [competitionScope, setCompetitionScope] = useState("Nacional");
  const [scoutMode, setScoutMode] = useState('live');
  const [sessionDate, setSessionDate] = useState(todayISO());

  const [athletes, setAthletes] = useState(() => safeLoad(STORAGE_KEYS.athletes, []));
  const [sessions, setSessions] = useState([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedOpponentId, setSelectedOpponentId] = useState("");
  const [favoriteAthleteIds, setFavoriteAthleteIds] = useState([]);
  const [athleteNameSearch, setAthleteNameSearch] = useState("");
  const [opponentNameSearch, setOpponentNameSearch] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from("user_favorite_athletes").select("athlete_id").eq("user_id", user.id);
      if (!error && active) setFavoriteAthleteIds((data || []).map((row) => row.athlete_id));
    })();
    return () => { active = false; };
  }, []);

  async function toggleFavoriteAthlete(athleteId) {
    if (!athleteId) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isFavorite = favoriteAthleteIds.includes(athleteId);
    if (isFavorite) {
      const { error } = await supabase.from("user_favorite_athletes").delete().eq("user_id", user.id).eq("athlete_id", athleteId);
      if (error) { alert(error.message || "Não foi possível remover o favorito."); return; }
      setFavoriteAthleteIds((prev) => prev.filter((id) => id !== athleteId));
    } else {
      const { error } = await supabase.from("user_favorite_athletes").insert({ user_id: user.id, athlete_id: athleteId });
      if (error && error.code !== "23505") { alert(error.message || "Não foi possível salvar o favorito."); return; }
      setFavoriteAthleteIds((prev) => prev.includes(athleteId) ? prev : [...prev, athleteId]);
    }
  }
  const [teamEntries, setTeamEntries] = useState([]);
  const [selectedRedTeamEntryId, setSelectedRedTeamEntryId] = useState("");
  const [selectedBlueTeamEntryId, setSelectedBlueTeamEntryId] = useState("");
  const [athleteClassFilter, setAthleteClassFilter] = useState("Todos");
  const [athleteGenderFilter, setAthleteGenderFilter] = useState("Todos");
  const [opponentClassFilter, setOpponentClassFilter] = useState("Todos");
  const [opponentGenderFilter, setOpponentGenderFilter] = useState("Todos");
  const [competitionClassFilter, setCompetitionClassFilter] = useState("Todos");
  const [competitionGenderFilter, setCompetitionGenderFilter] = useState("Todos");
  const [currentUserId, setCurrentUserId] = useState(() => localUser()?.id || "");
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
  const [currentUserIsSuperAdmin, setCurrentUserIsSuperAdmin] = useState(false);
  const [ownerAccounts, setOwnerAccounts] = useState([]);

  const [gameType, setGameType] = useState("Individual");

  const [athlete, setAthlete] = useState("");
  const [opponent, setOpponent] = useState("");

  const [athleteClass, setAthleteClass] = useState("");
  const [opponentClass, setOpponentClass] = useState("");
  const [gender, setGender] = useState("");

  const [athleteColor, setAthleteColor] = useState("Vermelho");

  useEffect(() => {
    let active = true;
    if(!currentUserId)return;
    setSessions(safeLoad(`${STORAGE_KEYS.sessions}:${currentUserId}`,safeLoad(STORAGE_KEYS.sessions,[]).filter(s=>s.ownerUserId===currentUserId)));

    async function loadAthletesFromDatabase() {
      const localAthletes = safeLoad(STORAGE_KEYS.athletes, []);
      const { data, error } = await supabase
        .from("athletes")
        .select("id,name,class,country,uf,gender,approval_status,created_by")
        .order("name");

      if (!active) return;
      if (error) {
        console.error("Erro ao carregar atletas do banco:", error);
        setAthletes(localAthletes);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const viewerId = authData.user?.id || "";
      const selectableAthletes = (data || []).filter((item) => item.approval_status === "approved" || (item.approval_status === "pending" && item.created_by === viewerId));
      const databaseAthletes = selectableAthletes.map((item) => ({
        id: item.id,
        name: item.name,
        athleteClass: item.class,
        country: item.country,
        uf: item.uf,
        gender: item.gender || "",
        observations: [item.country, item.uf].filter(Boolean).join(" · "),
        source: "database",
      }));

      const databaseIds = new Set(databaseAthletes.map((item) => item.id));
      const localOnly = localAthletes.filter((item) => item.source !== "database" && !databaseIds.has(item.id));
      setAthletes([...databaseAthletes, ...localOnly].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
    }

    async function loadTeamEntriesFromDatabase() {
      const { data, error } = await supabase
        .from("boccia_team_entries")
        .select("id,name,entity_type,division,country,approval_status,created_by")
        .order("entity_type")
        .order("name");
      if (!active) return;
      if (error) {
        console.error("Erro ao carregar equipes/pares do banco:", error);
        setTeamEntries([]);
        return;
      }
      const { data: authData } = await supabase.auth.getUser();
      const viewerId = authData.user?.id || "";
      setTeamEntries((data || []).filter((item) => item.approval_status === "approved" || (item.approval_status === "pending" && item.created_by === viewerId)));
    }

    loadAthletesFromDatabase();
    loadTeamEntriesFromDatabase();
    window.addEventListener('boccia-catalog-updated',loadAthletesFromDatabase);
    return () => { active = false; window.removeEventListener('boccia-catalog-updated',loadAthletesFromDatabase); };
  }, [currentUserId]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.athletes, athletes);
  }, [athletes]);

  useEffect(() => {
    if(currentUserId)safeSave(`${STORAGE_KEYS.sessions}:${currentUserId}`, sessions.filter(s=>s.ownerUserId===currentUserId));
  }, [sessions,currentUserId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data?.session?.user) setCurrentUserId(data.session.user.id);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setCurrentUserId(session?.user?.id || "");
    });
    return () => { active = false; listener?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    setSessions((prev) => prev.filter(s=>s.ownerUserId));
  }, [currentUserId]);

  const accountSessions = useMemo(() => currentUserId ? sessions.filter((s) => s.ownerUserId === currentUserId) : [], [sessions, currentUserId]);
  const historySessions = currentUserIsAdmin ? sessions : accountSessions;

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    async function loadSharedHistory() {
      const profileResult = await supabase.from("profiles").select("id,name,username,role").order("name");
      const sessionResult = await supabase.from("scout_sessions").select("id,owner_id,session_date,session_kind,game_type,athlete_id,opponent_id,athlete_name,opponent_name,payload,approval_status,created_at,updated_at").order("created_at", { ascending: false });
      if (!active) return;
      const profiles = profileResult.data || [];
      if (!profileResult.error) {
        setOwnerAccounts(profiles);
        setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && (p.role === "admin" || p.role === "super_admin")));
        setCurrentUserIsSuperAdmin(profiles.some((p) => p.id === currentUserId && p.role === "super_admin"));
      }
      if (!sessionResult.error) {
        const names = Object.fromEntries(profiles.map((p) => [p.id, p.name || p.username || "Conta"]));
        const dbSessions = (sessionResult.data || []).map((row) => {
          const p = row.payload || {};
          return {
            ...p,
            id: row.id,
            ownerUserId: row.owner_id,
            ownerDisplay: names[row.owner_id] || p.ownerDisplay || "Conta",
            date: p.date || row.session_date,
            sessionKind: p.sessionKind || row.session_kind,
            gameType: p.gameType || row.game_type,
            athleteId: p.athleteId || row.athlete_id,
            opponentId: p.opponentId || row.opponent_id,
            athlete: p.athlete || row.athlete_name,
            opponent: p.opponent || row.opponent_name,
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            createdAt: p.createdAt || row.created_at,
          };
        });
        const dbIds = new Set(dbSessions.map((s) => s.id));
        const localLegacy = safeLoad(`${STORAGE_KEYS.sessions}:${currentUserId}`, []).filter((s) => s.ownerUserId===currentUserId && !dbIds.has(s.id));
        setSessions([...dbSessions, ...localLegacy]);
      }
    }
    loadSharedHistory();
    return () => { active = false; };
  }, [currentUserId]);

  useEffect(() => {
    if(!currentUserId)return;
    const sync=()=>void flushAutosave(currentUserId);
    const timer=setTimeout(sync,500);
    return()=>clearTimeout(timer);
  },[sessions,currentUserId]);

  function addAthlete(item) {
    const normalizedName = item.name.trim().toLocaleLowerCase("pt-BR");
    const alreadyExists = athletes.some(
      (a) => a.name.trim().toLocaleLowerCase("pt-BR") === normalizedName && a.athleteClass === item.athleteClass
    );
    if (alreadyExists) {
      alert("Este atleta já está cadastrado nesta classe.");
      return;
    }
    setAthletes((prev) => [...prev, item].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
  }

  function deleteAthlete(id) {
    if (!confirm("Excluir este atleta do cadastro? O histórico já salvo será mantido.")) return;
    setAthletes((prev) => prev.filter((a) => a.id !== id));
    if (selectedAthleteId === id) {
      setSelectedAthleteId("");
      setAthlete("");
      setAthleteClass("");
    }
    if (selectedOpponentId === id) {
      setSelectedOpponentId("");
      setOpponent("");
      setOpponentClass("");
    }
  }

  function importAllData(data) {
    setAthletes(Array.isArray(data.athletes) ? data.athletes : []);
    setSessions(Array.isArray(data.sessions) ? data.sessions : []);
  }

  function clearAllData() {
    if (!confirm("Apagar todos os atletas e todo o histórico deste navegador?")) return;
    setAthletes([]);
    setSessions([]);
    setSelectedAthleteId("");
    setSelectedOpponentId("");
    setAthlete("");
    setOpponent("");
    setAthleteClass("");
    setOpponentClass("");
    safeSave(STORAGE_KEYS.athletes, []);
    safeSave(STORAGE_KEYS.sessions, []);
  }

  function chooseRegisteredAthlete(id) {
    setSelectedAthleteId(id);
    const found = athletes.find((a) => a.id === id);
    setAthlete(found?.name || "");
    setAthleteClass(found?.athleteClass || "");

    // Vermelho e azul podem ser escolhidos em qualquer ordem.
    if (selectedOpponentId === id) {
      setSelectedOpponentId("");
      setOpponent("");
      setOpponentClass("");
    }
  }

  function chooseRegisteredOpponent(id) {
    setSelectedOpponentId(id);
    const found = athletes.find((a) => a.id === id);
    setOpponent(found?.name || "");
    setOpponentClass(found?.athleteClass || "");
  }

  const isInternationalCompetition = sessionKind === "Campeonato" && competitionScope === "Internacional";
  const availableAthletes = athletes.filter((item) => {
    if (isInternationalCompetition) return true;
    const country = String(item.country || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return country === "brasil";
  });

  const filteredPrimaryAthletes = availableAthletes.filter((item) => {
    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : athleteClassFilter;
    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : athleteGenderFilter;
    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;
    const genderOk = activeGender === "Todos" || item.gender === activeGender;
    const nameOk = !athleteNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").startsWith(athleteNameSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id)) || a.name.localeCompare(b.name,"pt-BR"));
  const selectedAthleteRecord = athletes.find((item) => item.id === selectedAthleteId);
  const filteredOpponentAthletes = availableAthletes.filter((item) => {
    const activeClass = sessionKind === "Campeonato" ? competitionClassFilter : opponentClassFilter;
    const activeGender = sessionKind === "Campeonato" ? competitionGenderFilter : opponentGenderFilter;
    const classOk = activeClass === "Todos" || item.athleteClass === activeClass;
    const genderOk = activeGender === "Todos" || item.gender === activeGender;
    const nameOk = !opponentNameSearch.trim() || item.name.toLocaleLowerCase("pt-BR").startsWith(opponentNameSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id)) || a.name.localeCompare(b.name,"pt-BR"));
  const eligibleOpponents = filteredOpponentAthletes.filter((item) => {
    if (item.id === selectedAthleteId) return false;
    if (sessionKind === "Treino") return true;
    if (!selectedAthleteRecord) return true;
    return item.athleteClass === selectedAthleteRecord.athleteClass && item.gender === selectedAthleteRecord.gender;
  });

  const teamDivision = gameType === "Equipe BC1/BC2" ? "Equipe BC1/BC2" : gameType === "Par BC3" ? "Par BC3" : gameType === "Par BC4" ? "Par BC4" : "";
  const availableTeamEntries = teamEntries.filter((item) => item.division === teamDivision);
  function chooseRedTeamEntry(id) {
    setSelectedRedTeamEntryId(id);
    const found = availableTeamEntries.find((item) => item.id === id);
    setAthlete(found?.name || "");
    if (selectedBlueTeamEntryId === id) { setSelectedBlueTeamEntryId(""); setOpponent(""); }
  }
  function chooseBlueTeamEntry(id) {
    setSelectedBlueTeamEntryId(id);
    const found = availableTeamEntries.find((item) => item.id === id);
    setOpponent(found?.name || "");
  }

  const opponentColor =
    athleteColor === "Vermelho"
      ? "Azul"
      : athleteColor === "Azul"
      ? "Vermelho"
      : "";

  // =========================================================
  // PARTIDA
  // =========================================================

  const [matchHome,setMatchHome]=useState(false);
  const [draftId,setDraftId]=useState("");
  const [draftReady,setDraftReady]=useState(false);
  const lastDraft=useRef("");
  const storageWarned=useRef(false);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [tieBreak, setTieBreak] =
    useState(false);
  const [tieBreakRound, setTieBreakRound] = useState(1);

  const [showFinalDetails, setShowFinalDetails] = useState(false);
  const [finalDetailPanel, setFinalDetailPanel] = useState("");
  const [showMoreFundamentals, setShowMoreFundamentals] = useState(false);
  const [finalSelectedSide, setFinalSelectedSide] = useState("athlete");

  const regularEnds =
    getRegularEnds(gameType);

  const ends = tieBreak
    ? [...regularEnds, "Tie-Break"]
    : regularEnds;


  const [currentEnd, setCurrentEnd] = useState(0);

  const currentEndName = tieBreak && currentEnd >= regularEnds.length
    ? (tieBreakRound === 1 ? "Tie-Break" : `Tie-Break ${tieBreakRound}`)
    : ends[currentEnd];

  // =========================================================
  // ETAPA DA TELA
  // =========================================================

  const [stage, setStage] = useState("white");

  /*
    white
    color
    result
    play
    moveWhite
    endScore
  */

  // =========================================================
  // POSIÇÃO DA BRANCA
  // =========================================================

  const [whitePosition, setWhitePosition] = useState("");

  const [newWhitePosition, setNewWhitePosition] = useState("");

  // =========================================================
  // JOGADA ATUAL
  // =========================================================

  const [selectedPlayerId,setSelectedPlayerId]=useState('');
  const [selectedColor, setSelectedColor] = useState("");

  const [selectedResult, setSelectedResult] = useState("");

  // =========================================================
  // HISTÓRICO
  // =========================================================

  const [playsHistory, setPlaysHistory] = useState([]);
  const [historyEndFilter,setHistoryEndFilter]=useState('Atual');
  const [commandHistory, setCommandHistory] = useState([]);
  const [discardedBalls, setDiscardedBalls] = useState({});
  const [undoStack, setUndoStack] = useState([]);
  const [whitePoint, setWhitePoint] = useState(null);
  const [newWhitePoint, setNewWhitePoint] = useState(null);
  const [positionDraft, setPositionDraft] = useState(null);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [throwTimer, setThrowTimer] = useState({startedAt:null, elapsed:0});
  const [throwDuration, setThrowDuration] = useState(null);
  const [clockTick, setClockTick] = useState(Date.now());
  useEffect(() => { if(!throwTimer.startedAt)return; const id=setInterval(()=>setClockTick(Date.now()),250);return()=>clearInterval(id); },[throwTimer.startedAt]);
  const elapsedThrow = throwTimer.elapsed + (throwTimer.startedAt ? Math.max(0,clockTick-throwTimer.startedAt) : 0);
  function toggleTimerEnabled() {
    pushUndoSnapshot();
    const enabled=!timerEnabled;
    setTimerEnabled(enabled);setThrowDuration(null);
    const now=Date.now();setClockTick(now);
    setThrowTimer({startedAt:enabled && stage==='result' ? now : null,elapsed:0});
  }
  function changeTimer() {
    if(!timerEnabled)return;
    pushUndoSnapshot();
    const now=Date.now();setClockTick(now);
    setThrowTimer(t=>t.startedAt ? {startedAt:null,elapsed:t.elapsed+now-t.startedAt} : {...t,startedAt:now});
  }
  function openPosition(cell,target) {
    pushUndoSnapshot();
    if(cell==='TB') { if(target==='initial'){setWhitePosition(cell);setWhitePoint(null);setStage('color');}else{setNewWhitePosition(cell);setNewWhitePoint(null);}return; }
    setPositionDraft({cell,target,point:null});
  }
  function confirmPosition() {
    if(!positionDraft?.point)return;
    pushUndoSnapshot();
    if(positionDraft.target==='initial'){setWhitePosition(positionDraft.cell);setWhitePoint(positionDraft.point);setStage('color');}
    else {setNewWhitePosition(positionDraft.cell);setNewWhitePoint(positionDraft.point);}
    setPositionDraft(null);
  }

  useEffect(() => {
    document.body.classList.toggle("bocha-scout-live-mode", started && !matchHome);
    return () => document.body.classList.remove("bocha-scout-live-mode");
  }, [started,matchHome]);

  function pushUndoSnapshot() {
    const snapshot = {
      whitePoint, newWhitePoint, positionDraft, endScoreDraft, throwDuration, selectedPlayerId, timerEnabled,
      throwTimer: {startedAt:null,elapsed:throwTimer.elapsed+(throwTimer.startedAt?Date.now()-throwTimer.startedAt:0)},
      playsHistory: structuredClone(playsHistory),
      commandHistory: structuredClone(commandHistory),
      discardedBalls: structuredClone(discardedBalls),
      scores: structuredClone(scores),
      whitePosition,
      newWhitePosition,
      selectedColor,
      selectedResult,
      currentEnd,
      tieBreak,
      tieBreakRound,
      stage,
      started,
      finished,
    };
    setUndoStack((prev) => [...prev.slice(-49), snapshot]);
  }

  function undoLastAction() {
    if (undoStack.length === 0) {
      alert("Não há ação registrada para desfazer.");
      return;
    }
    const snapshot = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setSelectedPlayerId(snapshot.selectedPlayerId || '');
    setWhitePoint(snapshot.whitePoint || null);setNewWhitePoint(snapshot.newWhitePoint || null);
    setTimerEnabled(snapshot.timerEnabled ?? true);setPositionDraft(snapshot.positionDraft || null);setThrowTimer(snapshot.throwTimer || {startedAt:null,elapsed:0});
    setThrowDuration(snapshot.throwDuration ?? null);setEndScoreDraft(snapshot.endScoreDraft || {athlete:'',opponent:''});
    setPlaysHistory(snapshot.playsHistory);
    setCommandHistory(snapshot.commandHistory);
    setDiscardedBalls(snapshot.discardedBalls);
    setScores(snapshot.scores);
    setWhitePosition(snapshot.whitePosition);
    setNewWhitePosition(snapshot.newWhitePosition);
    setSelectedColor(snapshot.selectedColor);
    setSelectedResult(snapshot.selectedResult);
    setCurrentEnd(snapshot.currentEnd);
    setTieBreak(snapshot.tieBreak);
    setTieBreakRound(snapshot.tieBreakRound || 1);
    setStage(snapshot.stage);
    setStarted(snapshot.started);
    setFinished(snapshot.finished);
  }

  // =========================================================
  // PLACAR
  // =========================================================

  const [scores, setScores] = useState({});
  const [endScoreDraft,setEndScoreDraft]=useState({athlete:"",opponent:""});

  useEffect(() => {
    if(!currentUserId)return;
    const saved=readDraft(currentUserId);
    if(saved?.payload?.version===1) {
      const d=saved.payload;
      setDraftId(saved.id);
      setSessionKind(d.sessionKind);
      setCompetitionName(d.competitionName);
      setCompetitionPhase(d.competitionPhase);
      setCompetitionLevel(d.competitionLevel);
      setCompetitionScope(d.competitionScope);
      setSessionDate(d.sessionDate);setScoutMode(d.scoutMode || 'live');
      setWhitePoint(d.whitePoint || null);setNewWhitePoint(d.newWhitePoint || null);setPositionDraft(d.positionDraft || null);
      setTimerEnabled(d.timerEnabled ?? true);setThrowDuration(d.throwDuration ?? null);
      // Reloading cannot measure time while the app was closed.
      setThrowTimer({startedAt:null,elapsed:0});
      setSelectedAthleteId(d.selectedAthleteId);
      setSelectedOpponentId(d.selectedOpponentId);
      setSelectedRedTeamEntryId(d.selectedRedTeamEntryId);
      setSelectedBlueTeamEntryId(d.selectedBlueTeamEntryId);
      setGameType(d.gameType);
      setAthlete(d.athlete);
      setOpponent(d.opponent);
      setAthleteClass(d.athleteClass);
      setOpponentClass(d.opponentClass);
      setGender(d.gender);
      setAthleteColor(d.athleteColor);
      setStarted(d.started);
      setFinished(d.finished);
      setTieBreak(d.tieBreak);
      setTieBreakRound(d.tieBreakRound);
      setCurrentEnd(d.currentEnd);
      setStage(d.stage);
      setWhitePosition(d.whitePosition);
      setNewWhitePosition(d.newWhitePosition);
      setSelectedColor(d.selectedColor);setSelectedPlayerId(d.selectedPlayerId || '');
      setSelectedResult(d.selectedResult);
      setPlaysHistory(d.playsHistory);
      setCommandHistory(d.commandHistory);
      setDiscardedBalls(d.discardedBalls);
      setScores(d.scores);
      setEndScoreDraft(d.endScoreDraft || {athlete:"",opponent:""});
      setMatchHome(d.matchHome);
      setView(d.view);
    }
    setDraftReady(true);
    return listenAutosave(currentUserId);
  },[currentUserId]);
  const draftSnapshot={version:1,timerEnabled,selectedPlayerId,scoutMode,whitePoint,newWhitePoint,positionDraft,throwDuration,endScoreDraft,sessionKind,competitionName,competitionPhase,competitionLevel,competitionScope,sessionDate,selectedAthleteId,selectedOpponentId,selectedRedTeamEntryId,selectedBlueTeamEntryId,gameType,athlete,opponent,athleteClass,opponentClass,gender,athleteColor,started,finished,tieBreak,tieBreakRound,currentEnd,stage,whitePosition,newWhitePosition,selectedColor,selectedResult,playsHistory,commandHistory,discardedBalls,scores,matchHome,view};
  useLayoutEffect(()=>{
    if(!draftReady || !currentUserId || !draftId || (!started && !finished))return;
    const encoded=JSON.stringify(draftSnapshot);
    if(encoded===lastDraft.current)return;
    try {saveDraft(currentUserId,draftId,draftSnapshot);lastDraft.current=encoded;}
    catch(error){if(!storageWarned.current){storageWarned.current=true;alert('Não foi possível salvar a reserva neste aparelho. Verifique o espaço disponível.');}console.error(error);}
  });
  useEffect(()=>{
    if(!draftReady || !draftId)return;
    const timer=setTimeout(()=>void flushAutosave(currentUserId),500);
    return()=>clearTimeout(timer);
  },[currentUserId,draftReady,draftId,endScoreDraft,sessionKind,competitionName,competitionPhase,competitionLevel,competitionScope,sessionDate,selectedAthleteId,selectedOpponentId,selectedRedTeamEntryId,selectedBlueTeamEntryId,gameType,athlete,opponent,athleteClass,opponentClass,gender,athleteColor,started,finished,tieBreak,tieBreakRound,currentEnd,stage,whitePosition,newWhitePosition,selectedColor,selectedResult,playsHistory,commandHistory,discardedBalls,scores,matchHome,view]);
  function abandonGame() {
    if(!window.confirm('Abandonar esta partida? As jogadas e o placar desta partida serão descartados. Partidas anteriores serão mantidas.'))return;
    try {saveDraft(currentUserId,draftId,null,'closed');}catch {alert('Não foi possível descartar a partida com segurança. Tente novamente.');return;}
    void flushAutosave(currentUserId);
    setDraftId('');setMatchHome(false);newGame();setView('dashboard');
  }


  // =========================================================
  // INICIAR PARTIDA
  // =========================================================

  function startGame() {
    if(scoutMode==='recorded' && (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate) || sessionDate>todayISO())){alert('Informe a data real da partida, até hoje.');return;}
    if (sessionKind === "Campeonato" && !competitionName.trim()) {
      alert("Informe o nome do campeonato.");
      return;
    }
    if (sessionKind === "Campeonato" && !competitionPhase.trim()) {
      alert("Informe a fase do campeonato.");
      return;
    }
    if (!athlete.trim()) {
      alert(gameType === "Individual" ? "Selecione o Atleta Vermelho." : "Selecione o país ou clube do lado Vermelho.");
      return;
    }

    if (!opponent.trim()) {
      alert(gameType === "Individual" ? "Selecione o Atleta Azul." : "Selecione o país ou clube do lado Azul.");
      return;
    }

    if (gameType === "Individual" && !selectedAthleteId) {
      alert("Selecione o Atleta Vermelho.");
      return;
    }

    if (gameType === "Individual" && !selectedOpponentId) {
      alert("Selecione o Atleta Azul.");
      return;
    }

    if (gameType === "Individual" && selectedAthleteId === selectedOpponentId) {
      alert("O Atleta Vermelho e o Atleta Azul precisam ser pessoas diferentes.");
      return;
    }

    if (athleteColor !== "Vermelho") setAthleteColor("Vermelho");

    setDraftId(crypto.randomUUID());
    lastDraft.current="";
    setMatchHome(false);
    if(scoutMode==='live')setSessionDate(todayISO());
    setWhitePoint(null);setNewWhitePoint(null);setPositionDraft(null);setThrowDuration(null);setThrowTimer({startedAt:null,elapsed:0});
    setStarted(true);
    setFinished(false);

    setCurrentEnd(0);
    setTieBreak(false);
    setTieBreakRound(1);

    setWhitePosition("");
    setNewWhitePosition("");

    setSelectedColor("");
    setSelectedResult("");

    setPlaysHistory([]);
    setCommandHistory([]);
    setDiscardedBalls({});
    setUndoStack([]);
    setScores({});
    setEndScoreDraft({athlete:"",opponent:""});

    setStage("white");
  }

  // =========================================================
  // INICIAR NOVO END
  // =========================================================

  function startNewEnd(index, forcedWhite) {
    setCurrentEnd(index);
    setWhitePoint(null);setNewWhitePoint(null);setPositionDraft(null);setThrowTimer({startedAt:null,elapsed:0});setThrowDuration(null);

    // NOVO END = nova posição inicial da branca
    // (no Tie-Break a branca já entra fixa no TB)
    setWhitePosition(forcedWhite || "");
    setNewWhitePosition("");

    setSelectedColor("");
    setSelectedResult("");

    setStage(forcedWhite ? "color" : "white");
  }

  // =========================================================
  // BOLAS UTILIZADAS NO END
  // =========================================================

  const ballsUsed = useMemo(() => {
    const result = {
      Vermelho: 0,
      Azul: 0,
    };

    playsHistory
      .filter((p) => p.end === currentEndName)
      .forEach((p) => {
        if (p.color === "Vermelho") {
          result.Vermelho++;
        }

        if (p.color === "Azul") {
          result.Azul++;
        }
      });

    return result;
  }, [playsHistory, currentEndName]);

  const deliveredThisEnd = discardedBalls[currentEndName] || { Vermelho: 0, Azul: 0 };

  const redBallsAvailable = Math.max(0, 6 - ballsUsed.Vermelho - Number(deliveredThisEnd.Vermelho || 0));

  const blueBallsAvailable = Math.max(0, 6 - ballsUsed.Azul - Number(deliveredThisEnd.Azul || 0));

  const totalBallsUsed = ballsUsed.Vermelho + ballsUsed.Azul;
  const totalBallsResolved = totalBallsUsed + Number(deliveredThisEnd.Vermelho || 0) + Number(deliveredThisEnd.Azul || 0);

  // =========================================================
  // FUNDAMENTOS JÁ UTILIZADOS NO END
  // =========================================================

  const usedPlaysThisEnd = useMemo(() => {
    return new Set(
      playsHistory
        .filter((p) => p.end === currentEndName)
        .map((p) => p.play)
    );
  }, [playsHistory, currentEndName]);

  // =========================================================
  // POSIÇÃO DA BRANCA
  // =========================================================

  function selectInitialWhitePosition(position) { openPosition(position,'initial'); }
  function selectNewWhitePosition(position) { openPosition(position,'move'); }

  // =========================================================
  // SELECIONAR COR
  // =========================================================

  function selectColor(color) {
    if (color === "Vermelho" && redBallsAvailable <= 0) {
      alert("As 6 bolas vermelhas deste End já foram utilizadas.");
      return;
    }

    if (color === "Azul" && blueBallsAvailable <= 0) {
      alert("As 6 bolas azuis deste End já foram utilizadas.");
      return;
    }

    pushUndoSnapshot();
    setThrowDuration(null);const now=Date.now();setClockTick(now);setThrowTimer({startedAt:scoutMode==='live' && timerEnabled ? now : null,elapsed:0});
    setSelectedPlayerId(gameType==='Individual' ? (color===athleteColor?selectedAthleteId:selectedOpponentId) : '');
    setSelectedColor(color);

    setSelectedResult("");

    setStage("result");
  }

  // =========================================================
  // SELECIONAR RESULTADO
  // =========================================================

  function selectResult(result) {
    pushUndoSnapshot();
    if(scoutMode==='live') {
      const elapsed=throwTimer.elapsed+(throwTimer.startedAt?Date.now()-throwTimer.startedAt:0);
      setThrowDuration(timerEnabled && (throwTimer.startedAt || throwTimer.elapsed>0) ? elapsed : null);
      setThrowTimer({startedAt:null,elapsed});
    }
    setSelectedResult(result);

    setStage("play");
  }

  // =========================================================
  // SELECIONAR FUNDAMENTO
  // =========================================================

  function selectPlay(play) {
    if(!foundationAllowed(play,sessionKind,gameType,selectedColor===athleteColor?athleteClass:opponentClass))return;
    /*
      Saída de jogo só uma vez por End
    */

    if (
      play === "Saída de jogo" &&
      usedPlaysThisEnd.has("Saída de jogo")
    ) {
      alert(
        "A saída de jogo já foi registrada neste End."
      );

      return;
    }

    /*
      Mover branca
    */

    if (play === "Mover branca" && selectedResult !== 'Erro') {
      pushUndoSnapshot();setNewWhitePoint(null);
      setNewWhitePosition("");

      setStage("moveWhite");

      return;
    }

    /*
      Falta
      sempre é ERRO
    */

    const finalResult =
      play === "Falta"
        ? "Erro"
        : selectedResult;

    saveNormalPlay(play, finalResult);
  }

  // =========================================================
  // SALVAR JOGADA NORMAL
  // =========================================================

  function saveNormalPlay(play, result) {
    if (!selectedColor) {
      alert("Selecione a cor.");
      return;
    }

    if (!whitePosition) {
      alert("A posição da branca não foi definida.");
      return;
    }

    pushUndoSnapshot();

    const colorNumber =
      ballsUsed[selectedColor] + 1;

    const ballName =
      selectedColor === "Vermelho"
        ? `R${colorNumber}`
        : `A${colorNumber}`;

    const now = new Date();

    const newPlay = {
      id: Date.now() + Math.random(),

      end: currentEndName,

      color: selectedColor,

      ball: ballName,

      whitePositionFrom: whitePosition,

      whitePositionTo: whitePosition,
      whitePointTo: whitePoint,

      play,

      result,

      time: scoutMode==='live' ? now.toLocaleTimeString('pt-BR') : null,
      durationMs: scoutMode==='live' && !timerEnabled ? null : throwDuration, timingSource: (scoutMode==='live' && !timerEnabled) || throwDuration===null ? null : scoutMode==='recorded' ? 'manual-video' : 'stopwatch',
      playerName: (gameType==='Individual' ? athletes.find(a=>a.id===selectedPlayerId)?.name : '') || (selectedColor===athleteColor ? athlete : opponent),
      playerId: gameType==='Individual' ? selectedPlayerId || null : null,
      whitePointFrom: whitePoint,

      athlete,
      opponent,
      athleteClass,

      athleteColor,
      opponentColor,
    };

    setPlaysHistory((previous) => [
      ...previous,
      newPlay,
    ]);

    clearCurrentPlay();
  }

  // =========================================================
  // SALVAR MOVER BRANCA
  // =========================================================

  function saveMoveWhite() {
    if (!newWhitePosition) {
      alert("Selecione a nova posição da branca.");
      return;
    }

    pushUndoSnapshot();

    /*
      Mover branca sempre é ACERTO
    */

    const color =
      selectedColor;

    const colorNumber =
      ballsUsed[color] + 1;

    const ballName =
      color === "Vermelho"
        ? `R${colorNumber}`
        : `A${colorNumber}`;

    const now = new Date();

    const newPlay = {
      id: Date.now() + Math.random(),

      end: currentEndName,

      color,

      ball: ballName,

      whitePositionFrom: whitePosition,

      whitePositionTo: newWhitePosition,
      whitePointTo: newWhitePoint,

      play: "Mover branca",

      result: selectedResult,

      time: scoutMode==='live' ? now.toLocaleTimeString('pt-BR') : null,
      durationMs: scoutMode==='live' && !timerEnabled ? null : throwDuration, timingSource: (scoutMode==='live' && !timerEnabled) || throwDuration===null ? null : scoutMode==='recorded' ? 'manual-video' : 'stopwatch',
      playerName: (gameType==='Individual' ? athletes.find(a=>a.id===selectedPlayerId)?.name : '') || (selectedColor===athleteColor ? athlete : opponent),
      playerId: gameType==='Individual' ? selectedPlayerId || null : null,
      whitePointFrom: whitePoint,

      athlete,
      opponent,
      athleteClass,

      athleteColor,
      opponentColor,
    };

    setPlaysHistory((previous) => [
      ...previous,
      newPlay,
    ]);

    /*
      Atualiza a branca
    */

    setWhitePosition(newWhitePosition);setWhitePoint(newWhitePoint);
    setThrowDuration(null);setThrowTimer({startedAt:null,elapsed:0});

    setNewWhitePosition("");

    /*
      Volta diretamente para escolher a cor
    */

    setSelectedColor("");

    setSelectedResult("");

    /*
      Se as 12 bolas acabaram,
      abre o placar do End.
    */

    if (totalBallsResolved + 1 >= 12) {
      setStage("endScore");
      return;
    }

    setStage("color");
  }

  // =========================================================
  // ENTREGAR BOLAS RESTANTES DA COR SELECIONADA
  // =========================================================

  function deliverSelectedBalls() {
    if (!selectedColor) {
      alert("Selecione primeiro a cor que vai entregar as bolas.");
      return;
    }

    const remaining = selectedColor === "Vermelho" ? redBallsAvailable : blueBallsAvailable;
    if (remaining <= 0) {
      alert("Essa cor não possui bolas restantes para entregar.");
      return;
    }

    pushUndoSnapshot();

    const event = {
      id: `cmd-${Date.now()}-${Math.random()}`,
      type: "DELIVER_BALLS",
      end: currentEndName,
      color: selectedColor,
      ballsBefore: remaining,
      ballsAfter: 0,
      discarded: remaining,
      time: new Date().toLocaleTimeString("pt-BR"),
    };

    setCommandHistory((prev) => [...prev, event]);
    setDiscardedBalls((prev) => ({
      ...prev,
      [currentEndName]: {
        Vermelho: Number(prev[currentEndName]?.Vermelho || 0) + (selectedColor === "Vermelho" ? remaining : 0),
        Azul: Number(prev[currentEndName]?.Azul || 0) + (selectedColor === "Azul" ? remaining : 0),
      },
    }));

    setThrowTimer({startedAt:null,elapsed:0});setThrowDuration(null);
    const resolvedAfter = totalBallsResolved + remaining;
    setSelectedColor("");
    setSelectedResult("");
    setStage(resolvedAfter >= 12 ? "endScore" : "color");
  }

  // =========================================================
  // LIMPAR JOGADA
  // =========================================================

  function clearCurrentPlay() {
    setThrowTimer({startedAt:null,elapsed:0});setThrowDuration(null);
    setSelectedColor("");
    setSelectedResult("");

    /*
      Se as 12 bolas acabaram,
      abre o placar do End.
    */

    const totalAfterPlay =
      totalBallsResolved + 1;

    if (totalAfterPlay >= 12) {
      setStage("endScore");
      return;
    }

    setStage("color");
  }

  // =========================================================
  // PLACAR DO END
  // =========================================================

  function saveEndScore(athleteScore, opponentScore) {
    const a = athleteScore === "" ? 0 : Number(athleteScore);
    const o = opponentScore === "" ? 0 : Number(opponentScore);

    if (Number.isNaN(a) || Number.isNaN(o)) {
      alert("Digite um placar válido.");
      return;
    }

    pushUndoSnapshot();

    const updatedScores = {
      ...scores,

      [currentEndName]: {
        athlete: a,
        opponent: o,

        winner:
          a === o
            ? "Empate"
            : a > o
            ? athlete
            : opponent,
      },
    };

    setScores(updatedScores);
    setEndScoreDraft({athlete:"",opponent:""});

    const isTieBreakEnd = String(currentEndName).startsWith("Tie-Break");

    // Ends regulares: segue normalmente até o último.
    if (!isTieBreakEnd && currentEnd < regularEnds.length - 1) {
      startNewEnd(currentEnd + 1);
      return;
    }

    // Último End regular: se o placar regular empatar, abre o Tie-Break.
    if (!isTieBreakEnd) {
      const totals = getRegularScoreTotals(updatedScores);
      if (totals.athlete === totals.opponent) {
        setTieBreak(true);
        setTieBreakRound(1);
        startNewEnd(regularEnds.length, "TB");
        return;
      }
      setFinished(true);
      setStarted(false);
      return;
    }

    // Tie-Break nunca pode encerrar empatado. Se empatar, abre outro TB.
    if (a === o) {
      setTieBreak(true);
      setTieBreakRound((round) => round + 1);
      startNewEnd(regularEnds.length, "TB");
      return;
    }

    setFinished(true);
    setStarted(false);
  }


  // =========================================================
  // EXCLUIR JOGADA
  // =========================================================

  function removePlay(id) {
    pushUndoSnapshot();
    const removed=playsHistory.find(p=>p.id===id);
    const remaining=removeAndRenumber(playsHistory,id);
    setPlaysHistory(remaining);
    if(removed?.end===currentEndName){
      const latest=remaining.filter(p=>p.end===currentEndName).at(-1);
      setWhitePosition(latest?.whitePositionTo || latest?.whitePositionFrom || removed.whitePositionFrom);
      setWhitePoint(latest ? latest.whitePointTo || latest.whitePointFrom || null : removed.whitePointFrom || null);
      if(stage==='endScore')setStage('color');
    }
  }

  // =========================================================
  // ESTATÍSTICAS
  // =========================================================

  const currentEndPlays = useMemo(
    () =>
      playsHistory.filter(
        (p) => p.end === currentEndName
      ),
    [playsHistory, currentEndName]
  );

  function statsOf(plays) {
    return {
      geral: calcStats(plays),
      vermelho: calcStats(
        plays.filter((p) => p.color === "Vermelho")
      ),
      azul: calcStats(
        plays.filter((p) => p.color === "Azul")
      ),
    };
  }

  // Estatísticas acumuladas (partida inteira)
  const stats = useMemo(
    () => statsOf(playsHistory),
    [playsHistory]
  );

  // Estatísticas apenas da parcial atual (scout ao vivo)
  const endStats = useMemo(
    () => statsOf(currentEndPlays),
    [currentEndPlays]
  );

  // =========================================================
  // ESTATÍSTICAS POR FUNDAMENTO E COR
  // =========================================================

  const playStatsByColor = useMemo(
    () => buildPlayStats(playsHistory),
    [playsHistory]
  );

  const endPlayStatsByColor = useMemo(
    () => buildPlayStats(currentEndPlays),
    [currentEndPlays]
  );

  // =========================================================
  // MAPAS DE CALOR
  // =========================================================

  const heatmaps = useMemo(
    () => ({
      Vermelho: buildHeatmap(
        playsHistory.filter((p) => p.color === "Vermelho")
      ),
      Azul: buildHeatmap(
        playsHistory.filter((p) => p.color === "Azul")
      ),
    }),
    [playsHistory]
  );

  // =========================================================
  // RANKINGS
  // =========================================================

  function getRanking(source, color) {
    return Object.entries(source[color]).sort(
      ([, a], [, b]) => b.total - a.total
    );
  }

  function getBestPlay(source, color) {
    return (
      Object.entries(source[color])
        .filter(([, data]) => data.total >= 1)
        .sort(
          ([, a], [, b]) => b.efficiency - a.efficiency
        )[0] || null
    );
  }

  function getWorstPlay(source, color) {
    return (
      Object.entries(source[color])
        .filter(([, data]) => data.total >= 1)
        .sort(
          ([, a], [, b]) => b.errorRate - a.errorRate
        )[0] || null
    );
  }

  const redRanking = getRanking(playStatsByColor, "Vermelho");
  const blueRanking = getRanking(playStatsByColor, "Azul");
  const redBest = getBestPlay(playStatsByColor, "Vermelho");
  const blueBest = getBestPlay(playStatsByColor, "Azul");
  const redWorst = getWorstPlay(playStatsByColor, "Vermelho");
  const blueWorst = getWorstPlay(playStatsByColor, "Azul");

  const endRedRanking = getRanking(endPlayStatsByColor, "Vermelho");
  const endBlueRanking = getRanking(endPlayStatsByColor, "Azul");
  const endRedBest = getBestPlay(endPlayStatsByColor, "Vermelho");
  const endBlueBest = getBestPlay(endPlayStatsByColor, "Azul");
  const endRedWorst = getWorstPlay(endPlayStatsByColor, "Vermelho");
  const endBlueWorst = getWorstPlay(endPlayStatsByColor, "Azul");

  // =========================================================
  // PLACAR TOTAL
  // =========================================================

  const regularScoreTotals = getRegularScoreTotals(scores);
  const totalAthlete = regularScoreTotals.athlete;
  const totalOpponent = regularScoreTotals.opponent;

  // =========================================================
  // MELHOR END
  // =========================================================

  const bestEnd = useMemo(() => {
    let a = null;
    let o = null;

    Object.entries(scores).forEach(([name, s]) => {
      if (String(name).startsWith("Tie-Break")) return;
      const diffA = Number(s.athlete) - Number(s.opponent);
      const diffO = Number(s.opponent) - Number(s.athlete);

      if (diffA > 0 && (!a || diffA > a.diff)) {
        a = { name, diff: diffA, points: Number(s.athlete) };
      }

      if (diffO > 0 && (!o || diffO > o.diff)) {
        o = { name, diff: diffO, points: Number(s.opponent) };
      }
    });

    return { athlete: a, opponent: o };
  }, [scores]);

  // =========================================================
  // NOVA PARTIDA
  // =========================================================

  function newGame() {
    if(draftId && finished){saveDraft(currentUserId,draftId,null,"closed");void flushAutosave(currentUserId);}
    setDraftId("");setMatchHome(false);lastDraft.current="";setScoutMode("live");
    setStarted(false);
    setFinished(false);

    setAthlete("");
    setOpponent("");
    setSelectedAthleteId("");
    setSelectedOpponentId("");
    setSelectedRedTeamEntryId("");
    setSelectedBlueTeamEntryId("");

    setAthleteClass("");
    setOpponentClass("");
    setGender("");
    setAthleteColor("Vermelho");
    setSessionKind("Treino");
    setCompetitionScope("Nacional");
    setAthleteClassFilter("Todos");
    setAthleteGenderFilter("Todos");
    setOpponentClassFilter("Todos");
    setOpponentGenderFilter("Todos");
    setCompetitionName("");
    setCompetitionPhase("");
    setCompetitionLevel("Nacional");
    setSessionDate(todayISO());
    setView("new");

    setCurrentEnd(0);
    setTieBreak(false);
    setTieBreakRound(1);
    setShowFinalDetails(false);

    setStage("white");

    setWhitePosition("");
    setNewWhitePosition("");

    setSelectedColor("");
    setSelectedResult("");

    setPlaysHistory([]);
    setCommandHistory([]);
    setDiscardedBalls({});
    setUndoStack([]);
    setScores({});
    setEndScoreDraft({athlete:"",opponent:""});
  }


  useEffect(() => {
    if (!finished || !draftReady || !currentUserId || !draftId) return;

    const statsSnapshot = calcStats(playsHistory.filter((p) => p.color === athleteColor));
    const totals = getRegularScoreTotals(scores);

    const id = `session-${draftId}`;

    const completed = {
          id,
          ownerUserId: currentUserId || null,
          date: sessionDate,
          scoutMode, schemaVersion: 2,
          createdAt: new Date().toISOString(),
          sessionKind,
          competitionName: sessionKind === "Campeonato" ? competitionName.trim() : "",
          competitionPhase: sessionKind === "Campeonato" ? competitionPhase.trim() : "",
          competitionLevel: sessionKind === "Campeonato" ? competitionLevel : "",
          athleteGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedAthleteId)?.gender || "") : "",
          opponentGender: gameType === "Individual" ? (athletes.find((x) => x.id === selectedOpponentId)?.gender || "") : "",
          gameType,
          athleteId: gameType === "Individual" ? selectedAthleteId : null,
          opponentId: gameType === "Individual" ? selectedOpponentId : null,
          athlete,
          opponent,
          athleteClass: gameType === "Individual" ? athleteClass : teamDivision,
          opponentClass: gameType === "Individual" ? opponentClass : teamDivision,
          athleteColor,
          totalAthlete: totals.athlete,
          totalOpponent: totals.opponent,
          scores,
          plays: playsHistory,
          commands: commandHistory,
          stats: statsSnapshot,
        };
    queueSession(currentUserId, {id,owner_id:currentUserId,session_date:sessionDate,session_kind:sessionKind,game_type:gameType,athlete_id:completed.athleteId,opponent_id:completed.opponentId,athlete_name:athlete,opponent_name:opponent,payload:completed});
    setSessions(prev=>[completed,...prev.filter(item=>item.id!==id)]);
    void flushAutosave(currentUserId);
  }, [finished,draftReady,currentUserId,draftId]);

  async function exportMatchReport() {
    const doc=await createMatchReport({athlete,opponent,athleteColor,gameType,sessionKind,date:sessionDate,scoutMode,scores,totalAthlete,totalOpponent,plays:playsHistory,ownerDisplay:ownerAccounts.find(a=>a.id===currentUserId)?.name},buildPositionPerformance);
    doc.save(matchReportFileName({ athlete, opponent, sessionKind, date: sessionDate, competitionName }));
  }

  async function exportMatchReportLegacy() {
    const { jsPDF } = await import("jspdf");

    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 40;

    let y = 0;

    function ensure(space) {
      if (y + space > pageH - 40) {
        doc.addPage();
        y = M;
      }
    }

    function sectionTitle(text, rgb) {
      const c = rgb || [15, 23, 42];
      ensure(40);
      doc.setFillColor(c[0], c[1], c[2]);
      doc.roundedRect(M, y, pageW - M * 2, 22, 4, 4, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(text, M + 8, y + 15);
      y += 34;
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
    }


    function line(text, bold) {
      ensure(16);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(String(text), M, y);
      y += 14;
    }

    // ---------- CAPA / CABEÇALHO ----------
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("BOCHA SCOUT", M, 45);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("Relatório técnico da partida", M, 65);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleString("pt-BR"), pageW - M, 45, {
      align: "right",
    });

    y = 120;
    doc.setTextColor(30, 41, 59);

    sectionTitle("DADOS DA PARTIDA");
    line(`Tipo de jogo: ${gameType}`);
    line(`Atleta Vermelho: ${athlete}`);
    line(`Atleta Azul: ${opponent}`);
    line(`Sessão: ${sessionKind}   |   Data: ${formatDateBR(sessionDate)}`);
    if (sessionKind === "Campeonato" && competitionName.trim()) {
      line(`Campeonato: ${competitionName.trim()}`);
      if (competitionPhase.trim()) line(`Fase: ${competitionPhase.trim()}`);
    }
    if (gameType === "Individual") {
      line(`Classe: ${athleteClass}`);
    }
    line(
      `Ends disputados: ${Object.keys(scores).length}${
        tieBreak ? " (com Tie-Break)" : ""
      }`
    );
    y += 6;

    // ---------- PLACAR ----------
    sectionTitle("PLACAR");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    ensure(24);
    doc.text(
      `${athlete}  ${totalAthlete}  ×  ${totalOpponent}  ${opponent}`,
      M,
      y
    );
    y += 24;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    const endNames = Object.keys(scores);
    const colW = (pageW - M * 2) / Math.max(endNames.length + 1, 3);

    ensure(60);
    const tableTop = y;
    ["End", athlete, opponent, "Vencedor"].forEach((label, row) => {
      doc.setFont("helvetica", row === 0 ? "bold" : "normal");
      doc.text(label, M, tableTop + row * 16 + 10);
    });
    endNames.forEach((name, i) => {
      const x = M + colW * (i + 1);
      const s = scores[name];
      doc.setFont("helvetica", "bold");
      doc.text(name.replace("End ", "E"), x, tableTop + 10);
      doc.setFont("helvetica", "normal");
      doc.text(String(s.athlete), x, tableTop + 26);
      doc.text(String(s.opponent), x, tableTop + 42);
      doc.setFontSize(8);
      doc.text(
        s.winner === "Empate"
          ? "Empate"
          : s.winner === athlete
          ? "Atleta"
          : "Adv.",
        x,
        tableTop + 58
      );
      doc.setFontSize(10);
    });
    y = tableTop + 74;

    if (bestEnd.athlete) {
      line(
        `Melhor End de ${athlete}: ${bestEnd.athlete.name} (+${bestEnd.athlete.diff})`,
        true
      );
    }
    if (bestEnd.opponent) {
      line(
        `Melhor End de ${opponent}: ${bestEnd.opponent.name} (+${bestEnd.opponent.diff})`,
        true
      );
    }
    y += 6;

    // ---------- ESTATÍSTICAS ----------
    const fmt = (s) =>
      `Total ${s.total} | Acertos ${s.acertos} | Funcionais ${s.funcionais} | Erros ${s.erros} | Eficiência ${s.efficiency.toFixed(
        1
      )}% | Precisão ${s.accuracy.toFixed(1)}%`;

    function statsLine(label, s, rgb) {
      ensure(18);
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(M, y - 8, 4, 14, 2, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(label, M + 10, y);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      y += 14;
      line(fmt(s));
      y += 4;
    }

    const reportAthletePlays = playsHistory.filter((p) => p.color === athleteColor);
    const reportAthleteStats = calcStats(reportAthletePlays);
    const reportFundaments = buildPlayStats(reportAthletePlays)[athleteColor] || {};
    const reportRanking = Object.entries(reportFundaments).sort((a,b) => b[1].total - a[1].total);
    const reportBest = [...reportRanking].sort((a,b) => b[1].efficiency - a[1].efficiency)[0] || null;
    const reportWorst = [...reportRanking].sort((a,b) => b[1].errorRate - a[1].errorRate)[0] || null;

    sectionTitle(`ESTATÍSTICAS DO ATLETA - ${athleteColor.toUpperCase()}`);
    statsLine(athlete, reportAthleteStats, athleteColor === "Vermelho" ? [220,38,38] : [37,99,235]);
    y += 4;

    // ---------- FUNDAMENTOS ----------
    function rankingBlock(title, ranking, best, worst, rgb) {
      sectionTitle(title, rgb);
      if (ranking.length === 0) {
        line("Nenhuma jogada registrada.");
        return;
      }
      ranking.forEach(([name, d]) => {
        ensure(16);
        doc.setTextColor(30, 41, 59);
        doc.text(name, M, y);

        const totalTxt = `${d.total}x  ef. ${d.efficiency.toFixed(0)}%`;
        doc.text(totalTxt, pageW - M, y, { align: "right" });

        const countsRight =
          pageW - M - doc.getTextWidth(totalTxt) - 14;
        const gap = 22;

        doc.setTextColor(220, 38, 38);
        doc.text(`${d.erros}`, countsRight, y, { align: "right" });
        doc.setTextColor(234, 88, 12);
        doc.text(`${d.funcionais}`, countsRight - gap, y, {
          align: "right",
        });
        doc.setTextColor(22, 163, 74);
        doc.text(`${d.acertos}`, countsRight - gap * 2, y, {
          align: "right",
        });

        doc.setTextColor(30, 41, 59);
        y += 14;
      });

      y += 4;
      if (best) line(`Melhor fundamento: ${best[0]}`, true);
      if (worst) line(`Maior índice de erro: ${worst[0]}`, true);
      y += 8;
    }

    rankingBlock(
      `FUNDAMENTOS DO ATLETA - ${athleteColor.toUpperCase()}`,
      reportRanking,
      reportBest,
      reportWorst,
      athleteColor === "Vermelho" ? [220, 38, 38] : [37, 99, 235]
    );


    // ---------- MAPA DE CALOR POR RESULTADO ----------
    const RES_COLORS = {
      Acerto: [22, 163, 74],
      Funcional: [234, 88, 12],
      Erro: [220, 38, 38],
    };

    function buildResultMap(color) {
      const map = {};
      playsHistory
        .filter((p) => p.color === color)
        .forEach((p) => {
          const pos = p.whitePositionTo || p.whitePositionFrom;
          if (!pos) return;
          if (!map[pos]) {
            map[pos] = { total: 0, Acerto: 0, Funcional: 0, Erro: 0 };
          }
          map[pos].total++;
          if (map[pos][p.result] !== undefined) map[pos][p.result]++;
        });
      return map;
    }

    function legend() {
      ensure(20);
      let lx = M;
      [
        ["Acerto", RES_COLORS.Acerto],
        ["Funcional", RES_COLORS.Funcional],
        ["Erro", RES_COLORS.Erro],
      ].forEach(([label, rgb]) => {
        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(lx, y - 7, 9, 9, 2, 2, "F");
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(label, lx + 13, y);
        lx += 13 + doc.getTextWidth(label) + 14;
      });
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);
      y += 14;
    }

    function heatmapBlock(title, color, headRgb) {
      const map = buildResultMap(color);
      const cell = 26;
      const gap = 3;
      const rows = Math.ceil(POSITIONS.length / 6);
      ensure(rows * (cell + gap) + 90);
      sectionTitle(title, headRgb);
      legend();

      const startX = M;
      const startY = y;

      POSITIONS.forEach((pos, i) => {
        const col = i % 6;
        const row = Math.floor(i / 6);
        const x = startX + col * (cell + gap);
        const cy = startY + row * (cell + gap);

        if (pos === null) return;

        const d = map[pos];

        if (!d) {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(x, cy, cell, cell, 3, 3, "F");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(pos, x + cell / 2, cy + 16, { align: "center" });
          doc.setFontSize(10);
          doc.setTextColor(30, 41, 59);
          return;
        }

        // cor dominante da posição
        const dominant = ["Acerto", "Funcional", "Erro"].reduce((a, b) =>
          d[b] > d[a] ? b : a
        );
        const rgb = RES_COLORS[dominant];

        doc.setFillColor(rgb[0], rgb[1], rgb[2]);
        doc.roundedRect(x, cy, cell, cell, 3, 3, "F");

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.text(pos, x + cell / 2, cy + 11, { align: "center" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(String(d.total), x + cell / 2, cy + 21, {
          align: "center",
        });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
      });

      y = startY + rows * (cell + gap) + 12;

      const tot = Object.values(map).reduce(
        (acc, d) => ({
          total: acc.total + d.total,
          Acerto: acc.Acerto + d.Acerto,
          Funcional: acc.Funcional + d.Funcional,
          Erro: acc.Erro + d.Erro,
        }),
        { total: 0, Acerto: 0, Funcional: 0, Erro: 0 }
      );

      doc.setFontSize(9);
      line(
        `${tot.total} jogada(s) · ${tot.Acerto} acerto(s) · ${tot.Funcional} funcional(is) · ${tot.Erro} erro(s). Cor da célula = resultado predominante; número = jogadas na posição.`
      );
      doc.setFontSize(10);
      y += 6;
    }

    heatmapBlock(
      `MAPA DE CALOR DO ATLETA - ${athleteColor.toUpperCase()}`,
      athleteColor,
      athleteColor === "Vermelho" ? [220, 38, 38] : [37, 99, 235]
    );

    // ---------- COMANDOS ----------
    if (commandHistory.length > 0) {
      sectionTitle("COMANDOS DA PARTIDA", [124, 58, 237]);
      commandHistory.forEach((e) => {
        line(`${e.end} · Entregar Bola · ${e.color} · ${e.discarded} bola(s) entregues`);
      });
      y += 6;
    }

    // ---------- HISTÓRICO ----------
    sectionTitle("HISTÓRICO DE JOGADAS DA PARTIDA", [15, 23, 42]);
    legend();

    playsHistory.forEach((p, i) => {
      ensure(18);
      const rgb = RES_COLORS[p.result] || [100, 116, 139];
      const w = pageW - M * 2;

      // faixa de fundo suave + barra lateral com a cor do resultado
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(M, y - 9, w, 15, 2, 2, "F");
      doc.setFillColor(rgb[0], rgb[1], rgb[2]);
      doc.roundedRect(M, y - 9, 4, 15, 2, 2, "F");

      // bolinha da cor do time
      const teamRgb = p.color === "Vermelho" ? [220, 38, 38] : [37, 99, 235];
      doc.setFillColor(teamRgb[0], teamRgb[1], teamRgb[2]);
      doc.circle(M + 14, y - 2, 3.5, "F");

      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        `#${i + 1}  ${p.end}  ·  ${p.ball}  ·  ${p.play}  ·  branca ${
          p.whitePositionFrom
        }${
          p.whitePositionTo !== p.whitePositionFrom
            ? ` > ${p.whitePositionTo}`
            : ""
        }`,
        M + 24,
        y
      );

      doc.setFont("helvetica", "bold");
      doc.setTextColor(rgb[0], rgb[1], rgb[2]);
      doc.text(p.result, pageW - M - 6, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);

      y += 17;
    });
    if (playsHistory.length === 0) line("Nenhuma jogada registrada.");


    // ---------- RODAPÉ ----------
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Bocha Scout · ${athlete} x ${opponent} · página ${i}/${pages}`,
        pageW / 2,
        pageH - 20,
        { align: "center" }
      );
    }

    doc.save(
      matchReportFileName({
        athlete,
        opponent,
        sessionKind,
        date: sessionDate || new Date().toISOString().slice(0, 10),
        competitionName,
      })
    );
  }

  // =========================================================
  // TELA DE CADASTRO
  // =========================================================

  if(!draftReady)return <div style={{padding:24}}>Carregando Bocha Scout...</div>;
  if ((!started && !finished) || matchHome) {
    return (
      <div style={styles.page} className={`hub-scout-home ${view==='dashboard'||view==='compare'?'hub-dashboard':''} ${view==='my-matches'?'my-matches-view':''}`}>
        <div style={styles.container}>
          {view !== "dashboard" && <TopNav view={view} setView={(next) => setView(next === "data" && !currentUserIsSuperAdmin ? "dashboard" : next)} isSuperAdmin={currentUserIsSuperAdmin} />}

          {started && <div style={{...styles.card,display:"flex",gap:10,flexWrap:"wrap"}}><button style={{...styles.button,...styles.green}} onClick={()=>setMatchHome(false)}>Continuar partida</button><button style={{...styles.button,background:"#b91c1c"}} onClick={abandonGame}>Abandonar partida</button></div>}
          {view === "dashboard" && (
            <HomeScreen
              sessions={accountSessions}
              athletes={athletes}
              onNewTraining={() => { if(started){setMatchHome(false);return;} setSessionKind("Treino"); setCompetitionName(""); setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new"); }}
              onNewCompetition={() => { if(started){setMatchHome(false);return;} setSessionKind("Campeonato"); setCompetitionName(""); setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new"); }}
              onHistory={() => {setView("history");window.scrollTo(0,0);}}
              onMyMatches={() => {setView("my-matches");window.scrollTo(0,0);}}
              onCompare={() => {setView('compare');window.scrollTo(0,0);}}
            />
          )}

          {view === "compare" && (
            <main className="home-screen home-compare-screen">
              <section className="home-compare-view">
                <div className="home-compare-heading"><h1>Comparar atletas</h1><p>Veja dois atletas lado a lado usando os scouts já registrados.</p></div>
                <AthleteComparison sessions={accountSessions} standalone />
              </section>
            </main>
          )}
          {view === "athletes" && (
            <AthletesScreen
              athletes={athletes}
              sessions={accountSessions}
              onAdd={addAthlete}
              onDelete={deleteAthlete}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "my-matches" && (
            <MyMatchesScreen
              sessions={historySessions}
              onDeleted={id=>setSessions(previous=>previous.filter(item=>item.id!==id))}
              isAdmin={currentUserIsAdmin}
              isSuperAdmin={currentUserIsSuperAdmin}
              ownerAccounts={ownerAccounts}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "history" && (
            <HistoryScreen
              sessions={historySessions}
              onDeleted={id=>setSessions(previous=>previous.filter(item=>item.id!==id))}
              athletes={athletes}
              isAdmin={currentUserIsAdmin}
              isSuperAdmin={currentUserIsSuperAdmin}
              ownerAccounts={ownerAccounts}
              favoriteAthleteIds={favoriteAthleteIds}
              onToggleFavorite={toggleFavoriteAthlete}
              onBack={() => setView("dashboard")}
            />
          )}

          {dataHost && currentUserIsSuperAdmin && createPortal(
            <DataScreen
              athletes={athletes}
              sessions={sessions}
              onImport={importAllData}
              onClear={clearAllData}
            />, dataHost
          )}

          {view === "new" && (
            <div style={styles.card}>
              <h2 className="new-scout-title">{sessionKind === "Campeonato" ? <Trophy size={24} weight="fill" aria-hidden="true" /> : <Play size={24} weight="fill" aria-hidden="true" />}<span>Novo Scout · {sessionKind}</span></h2>
              <p style={{ color: "#64748b", marginTop: -4 }}>
                <label className="new-scout-inline-field"><Broadcast size={17} weight="bold" aria-hidden="true" /><span>Modo do Scout</span><select aria-label="Modo do Scout" value={scoutMode} onChange={e=>{setScoutMode(e.target.value);setSessionDate(e.target.value==='recorded'?'':todayISO());}}><option value="live">Ao Vivo</option><option value="recorded">Scout de Partida Gravada</option></select></label>
                {scoutMode==='recorded' ? <label className="new-scout-inline-field"><CalendarBlank size={17} weight="bold" aria-hidden="true" /><span>Data real da partida</span><input aria-label="Data real da partida" type="date" required max={todayISO()} value={sessionDate} onChange={e=>setSessionDate(e.target.value)}/></label> : <span className="new-scout-auto-date"><CalendarBlank size={17} weight="bold" aria-hidden="true" /><span>Data automática: <strong>{formatDateBR(todayISO())}</strong></span></span>}
              </p>

              <div style={styles.grid}>
                {sessionKind === "Campeonato" && (
                  <Field label="Abrangência do campeonato">
                    <select value={competitionScope} onChange={(e) => { setCompetitionScope(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}>
                      <option value="Nacional">Campeonato Nacional · Brasil</option>
                      <option value="Internacional">Campeonato Internacional · Todos os países</option>
                    </select>
                  </Field>
                )}

                <Field label={<span className="new-scout-field-label"><Users size={17} weight="bold" aria-hidden="true" />Tipo de jogo</span>}>
                  <select
                    value={gameType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setGameType(value);
                      setAthlete("");
                      setOpponent("");
                      setSelectedAthleteId("");
                      setSelectedOpponentId("");
                      setAthleteClass("");
                      setOpponentClass("");
                      setSelectedRedTeamEntryId("");
                      setSelectedBlueTeamEntryId("");
                    }}
                    style={styles.input}
                  >
                    {GAME_TYPES.map((type) => <option key={type}>{type}</option>)}
                  </select>
                </Field>

                {sessionKind === "Campeonato" && (
                  <>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Nome do campeonato">
                        <input value={competitionName} onChange={(e) => setCompetitionName(e.target.value)} placeholder="Ex.: Brasileiro de Jovens" style={styles.input} />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Fase do campeonato">
                        <input value={competitionPhase} onChange={(e) => setCompetitionPhase(e.target.value)} placeholder="Ex.: Fase classificatória, semifinal, final" style={styles.input} />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Nível do campeonato">
                        <select value={competitionLevel} onChange={(e) => setCompetitionLevel(e.target.value)} style={styles.input}>
                          <option>Nacional</option>
                          <option>Internacional</option>
                        </select>
                      </Field>
                    </div>
                  </>
                )}

                {gameType === "Individual" && sessionKind === "Campeonato" && (
                  <>
                    <div style={{ gridColumn: "1 / -1", fontWeight: 900, color: "#334155", marginTop: 4 }}>Filtros da partida</div>
                    <Field label={<span className="new-scout-field-label"><Tag size={17} weight="bold" aria-hidden="true" />Classe</span>}><select value={competitionClassFilter} onChange={(e) => { setCompetitionClassFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}><option value="Todos">Todas as classes</option>{CLASSES.map((c)=><option key={c} value={c}>{c}</option>)}</select></Field>
                    <Field label={<span className="new-scout-field-label"><SlidersHorizontal size={17} weight="bold" aria-hidden="true" />Gênero</span>}><select value={competitionGenderFilter} onChange={(e) => { setCompetitionGenderFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}><option value="Todos">Todos os gêneros</option>{GENDERS.map((g)=><option key={g} value={g}>{g}</option>)}</select></Field>
                  </>
                )}

                {gameType === "Individual" && sessionKind === "Treino" && (
                  <>
                    <div className="new-scout-athlete-heading is-red"><span className="new-scout-athlete-icon"><User size={16} weight="bold" /></span>Atleta Vermelho</div>
                    <Field label={<span className="new-scout-field-label"><Tag size={17} weight="bold" aria-hidden="true" />Classe do atleta</span>}>
                      <select value={athleteClassFilter} onChange={(e) => { setAthleteClassFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label={<span className="new-scout-field-label"><SlidersHorizontal size={17} weight="bold" aria-hidden="true" />Gênero do atleta</span>}>
                      <select value={athleteGenderFilter} onChange={(e) => { setAthleteGenderFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {gameType === "Individual" ? (
                  <Field label={<span className="new-scout-athlete-label is-red"><span className="new-scout-athlete-icon"><User size={16} weight="bold" /></span>Atleta Vermelho</span>}>
                    <AthleteCombobox
                      items={filteredPrimaryAthletes}
                      value={selectedAthleteId}
                      onChange={chooseRegisteredAthlete}
                      query={athleteNameSearch}
                      setQuery={setAthleteNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="Buscar ou selecionar atleta..."
                    />
                  </Field>
                ) : (
                  <Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />{teamDivision} · Vermelho</span>}>
                    <select value={selectedRedTeamEntryId} onChange={(e) => chooseRedTeamEntry(e.target.value)} style={styles.input}>
                      <option value="">Selecione país ou clube</option>
                      {availableTeamEntries.map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.entity_type}</option>
                      ))}
                    </select>
                  </Field>
                )}

                {gameType === "Individual" && sessionKind === "Treino" && (
                  <>
                    <div className="new-scout-athlete-heading is-blue"><span className="new-scout-athlete-icon"><User size={16} weight="bold" /></span>Atleta Azul</div>
                    <Field label={<span className="new-scout-field-label"><Tag size={17} weight="bold" aria-hidden="true" />Classe do atleta azul</span>}>
                      <select value={opponentClassFilter} onChange={(e) => { setOpponentClassFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label={<span className="new-scout-field-label"><SlidersHorizontal size={17} weight="bold" aria-hidden="true" />Gênero do atleta azul</span>}>
                      <select value={opponentGenderFilter} onChange={(e) => { setOpponentGenderFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {gameType === "Individual" ? (
                  <Field label={<span className="new-scout-athlete-label is-blue"><span className="new-scout-athlete-icon"><User size={16} weight="bold" /></span>Atleta Azul</span>}>
                    <AthleteCombobox
                      items={eligibleOpponents}
                      value={selectedOpponentId}
                      onChange={chooseRegisteredOpponent}
                      query={opponentNameSearch}
                      setQuery={setOpponentNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="Buscar ou selecionar atleta..."
                    />
                  </Field>
                ) : (
                  <Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#2563eb", display: "inline-block", flex: "0 0 12px" }} />{teamDivision} · Azul</span>}>
                    <select value={selectedBlueTeamEntryId} onChange={(e) => chooseBlueTeamEntry(e.target.value)} style={styles.input}>
                      <option value="">Selecione país ou clube</option>
                      {availableTeamEntries.filter((item) => item.id !== selectedRedTeamEntryId).map((item) => (
                        <option key={item.id} value={item.id}>{item.name} · {item.entity_type}</option>
                      ))}
                    </select>
                  </Field>
                )}
              </div>

              {gameType === "Individual" && athlete && (
                <div style={styles.info}>
                  <strong>{athlete}</strong> · {athleteClass}
                  <br />
                  Cadastro carregado automaticamente.
                </div>
              )}

              {gameType !== "Individual" && (
                <div style={styles.info}>
                  Em <strong>{gameType}</strong>, selecione o país ou clube para o lado vermelho e para o lado azul. A classe já é definida pelo tipo de jogo e não precisa de filtro de gênero ou classe.
                </div>
              )}

              <button onClick={startGame} style={{ ...styles.button, ...styles.green, width: "100%", marginTop: 20 }}>
                 <Play size={18} weight="fill" aria-hidden="true" /> Iniciar Scout
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================
  // PARTIDA
  // =========================================================


  const liveAthleteEndStats = calcStats(currentEndPlays.filter((p) => p.color === athleteColor));
  const liveOpponentEndStats = calcStats(currentEndPlays.filter((p) => p.color === opponentColor));
  const liveAthleteMatchStats = calcStats(playsHistory.filter((p) => p.color === athleteColor));
  const liveOpponentMatchStats = calcStats(playsHistory.filter((p) => p.color === opponentColor));

  if (started) {
    const lastRecordedPlay = currentEndPlays[currentEndPlays.length - 1];
    const redName = athleteColor === "Vermelho" ? athlete : opponent;
    const blueName = athleteColor === "Azul" ? athlete : opponent;
    const redScore = athleteColor === "Vermelho" ? totalAthlete : totalOpponent;
    const blueScore = athleteColor === "Azul" ? totalAthlete : totalOpponent;

    return (
      <div style={styles.page} className="scout-live-page">
        <div style={styles.container} className="scout-live-container">
          <nav className="classic-topbar" aria-label="Navegação da partida">
              <button type="button" className="classic-home" aria-label="Início" title="Início" onClick={()=>{setView("dashboard");setMatchHome(true);}}>
                <House aria-hidden="true"/>
              </button>
              <div className="classic-brand">
                <img src="/bocha-scout-emblem.png" alt="" />
                <div><strong>BOCHA <span>SCOUT</span></strong><small>DADOS QUE INCLUEM</small></div>
              </div>
              <details className="classic-menu" onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))event.currentTarget.open=false;}} onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector("summary")?.focus();}}}>
                <summary aria-label="Opções da partida" title="Opções da partida"><span aria-hidden="true">⋮</span></summary>
                <div className="classic-menu-panel">
                  <button type="button" onClick={event=>{event.currentTarget.closest("details")?.removeAttribute("open");abandonGame();}}>Abandonar partida</button>
                </div>
              </details>
            </nav>
          <section className="classic-scoreboard" aria-label="Placar da partida">
            <div className="classic-end">{currentEndName}</div>
            {scoutMode==='live' && <button type="button" className={`classic-timer ${timerEnabled?'is-enabled':'is-off'} ${throwTimer.startedAt?'is-running':''}`} aria-pressed={timerEnabled} aria-label={timerEnabled?'Desativar cronômetro':'Ativar cronômetro'} title={timerEnabled?'Clique para desativar a cronometragem':'Clique para ativar a cronometragem'} onClick={toggleTimerEnabled}><Timer aria-hidden="true" size={26}/><strong>{timerEnabled?formatDuration(elapsedThrow):'Desligado'}</strong></button>}
            <div className="classic-player classic-player-red">
              <strong title={redName}>{redName}</strong><span>VERMELHO</span>
              <div className="classic-balls" aria-label={`${redBallsAvailable} bolas vermelhas restantes`}>
                {Array.from({ length: 6 }, (_, i) => <img key={i} src="/scout-assets/red-ball.png" alt="" className={i < redBallsAvailable ? "is-active" : "is-used"} />)}
              </div>
            </div>
            <div className="classic-score"><b>{blueScore}</b><span>×</span><b>{redScore}</b></div>
            <div className="classic-player classic-player-blue">
              <strong title={blueName}>{blueName}</strong><span>AZUL</span>
              <div className="classic-balls" aria-label={`${blueBallsAvailable} bolas azuis restantes`}>
                {Array.from({ length: 6 }, (_, i) => <img key={i} src="/scout-assets/blue-ball.png" alt="" className={i < blueBallsAvailable ? "is-active" : "is-used"} />)}
              </div>
            </div>
          {whitePosition && (
            <div className="classic-white" aria-label={`Posição da branca: ${whitePosition}`}>
              <img className="classic-white-ball" src="/scout-assets/white-ball.png" alt="Bola branca" />
              <strong>{whitePosition}</strong>
              
            </div>
          )}

          </section>


          {positionDraft && <PrecisePosition cell={positionDraft.cell} point={positionDraft.point} onPoint={point=>{pushUndoSnapshot();setPositionDraft({...positionDraft,point});}} onConfirm={confirmPosition} onBack={()=>{pushUndoSnapshot();setPositionDraft(null);}} />}
          {stage==='result' && <section className="throw-timer">
            <strong>{scoutMode==='recorded' ? 'Tempo do vídeo (opcional)' : 'Tempo do lançamento'}</strong>
            {scoutMode==='recorded' ? <label>Segundos observados no vídeo <input aria-label="Tempo no vídeo em segundos" type="number" min="0" step="0.1" value={throwDuration===null?'':throwDuration/1000} onChange={e=>{pushUndoSnapshot();setThrowDuration(e.target.value===''?null:Math.max(0,Number(e.target.value))*1000);}} /></label> : <><output>{formatDuration(elapsedThrow)}</output><button onClick={changeTimer}>{throwTimer.startedAt?'Pausar':throwTimer.elapsed?'Retomar cronômetro':'Iniciar cronômetro'}</button><small>Inicie quando o atleta começar. Ao marcar o resultado, o tempo para. Sem iniciar, fica não registrado.</small></>}
          </section>}
          {/* =================================================
              ETAPA 1 - POSIÇÃO INICIAL
          ================================================= */}

          {stage === "white" && !positionDraft && (
            <div style={styles.card} className="scout-action-card scout-position-card">
              <StepHeader
                number="1"
                title="Posição inicial da branca"
              />

              <p style={styles.helpText}>
                Selecione onde a bola branca
                está antes de começar as
                jogadas deste End.
              </p>

              <PositionMap
                selected={
                  whitePosition
                }
                onSelect={
                  selectInitialWhitePosition
                }
              />
            </div>
          )}

          {/* =================================================
              ETAPA 2 - COR
          ================================================= */}

          {stage === "color" && (
            <div style={styles.card} className="scout-action-card scout-color-card">
              <StepHeader
                number="2"
                title="Quem vai jogar?"
              />

              <p style={styles.helpText}>
                Escolha a cor. A bola será
                consumida automaticamente.
              </p>

              <div
                className="scout-color-grid"
                style={
                  styles.colorGrid
                }
              >
                <button
                  disabled={
                    redBallsAvailable <=
                    0
                  }
                  onClick={() =>
                    selectColor(
                      "Vermelho"
                    )
                  }
                  style={{
                    ...styles.colorButton,
                    background:
                      redBallsAvailable >
                      0
                        ? "#dc2626"
                        : "#94a3b8",
                  }}
                >
                  <img src="/scout-assets/red-ball.png" alt="" />
                  <strong>{redName}</strong>
                  <span>VERMELHO</span>
                </button>

                <button
                  disabled={
                    blueBallsAvailable <=
                    0
                  }
                  onClick={() =>
                    selectColor("Azul")
                  }
                  style={{
                    ...styles.colorButton,
                    background:
                      blueBallsAvailable >
                      0
                        ? "#2563eb"
                        : "#94a3b8",
                  }}
                >
                  <img src="/scout-assets/blue-ball.png" alt="" />
                  <strong>{blueName}</strong>
                  <span>AZUL</span>
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              ETAPA 3 - RESULTADO
          ================================================= */}

          {stage === "result" && (
            <div style={styles.card} className="scout-action-card scout-result-card">
              <StepHeader
                number="3"
                title="Resultado da jogada"
              />

              <div className={`scout-selected-color is-${selectedColor.toLowerCase()}`}><strong>{selectedColor}</strong></div>

              <div className="scout-deliver-action" style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                <button
                  onClick={deliverSelectedBalls}
                  style={{
                    ...styles.button,
                    background: "#7c3aed",
                    width: "auto",
                    minWidth: 0,
                    padding: "7px 12px",
                    fontSize: 12,
                    lineHeight: 1.2,
                  }}
                >
                  Entregar Bola · {selectedColor}
                </button>
              </div>
              <p style={{ ...styles.helpText, marginTop: 0 }}>As bolas entregues vão a zero, ficam registradas no End e não contam como erro técnico.</p>

              <div
                className="scout-result-grid"
                style={
                  styles.resultGrid
                }
              >
                <button
                  onClick={() =>
                    selectResult(
                      "Acerto"
                    )
                  }
                  style={{
                    ...styles.resultBig,
                    background:
                      "#16a34a",
                  }}
                >
                  
                  <Circle className="scout-result-symbol" aria-hidden="true"/><strong>Acerto</strong>
                </button>

                <button
                  onClick={() =>
                    selectResult(
                      "Funcional"
                    )
                  }
                  style={{
                    ...styles.resultBig,
                    background:
                      "#f97316",
                  }}
                >
                  
                  <Crosshair className="scout-result-symbol" aria-hidden="true"/><strong>Funcional</strong>
                </button>

                <button
                  onClick={() =>
                    selectResult(
                      "Erro"
                    )
                  }
                  style={{
                    ...styles.resultBig,
                    background:
                      "#dc2626",
                  }}
                >
                  
                  <XCircle className="scout-result-symbol" aria-hidden="true"/><strong>Erro</strong>
                </button>
              </div>
            </div>
          )}

          {/* =================================================
              ETAPA 4 - FUNDAMENTO
          ================================================= */}

          {stage === "play" && (
            <div style={styles.card} className="scout-action-card scout-play-card">
              <StepHeader
                number="4"
                title="Qual foi o fundamento?"
              />

              <div
                style={styles.selectedInfo}
              >
                Resultado:{" "}
                <strong>
                  {selectedResult}
                </strong>
              </div>

              {(() => {
              const allowedPlays = sortFoundations(
                PLAYS.filter(play=>foundationAllowed(play,sessionKind,gameType,selectedColor===athleteColor?athleteClass:opponentClass))
              );
              const visiblePlays = showMoreFundamentals
                ? allowedPlays
                : allowedPlays.slice(0, VISIBLE_FOUNDATIONS);
              return (
              <>
              <div
                className="scout-play-grid"
                style={
                  styles.playGrid
                }
              >
                {visiblePlays.map((play) => {
                  const unavailable =
                    play ===
                      "Saída de jogo" &&
                    usedPlaysThisEnd.has(
                      "Saída de jogo"
                    );

                  return (
                    <button
                      key={play}
                      type="button"
                      disabled={
                        unavailable
                      }
                      onClick={() =>
                        selectPlay(
                          play
                        )
                      }
                      style={{
                        ...styles.playButton,

                        ...(unavailable
                          ? styles.playDisabled
                          : {}),
                      }}
                    >
                      <img className="scout-play-icon" src={playAsset(play)} alt="" />
                      <span className="scout-play-label">{play}</span>
                    </button>
                  );
                })}
              </div>
              {allowedPlays.length > VISIBLE_FOUNDATIONS && (
                <button type="button" className="scout-more-fundamentals" onClick={() => setShowMoreFundamentals((value) => !value)}>
                  {showMoreFundamentals ? "Menos fundamentos" : "Mais fundamentos"}
                  <span aria-hidden="true">{showMoreFundamentals ? "⌃" : "⌄"}</span>
                </button>
              )}
              </>
              );
              })()}
            </div>
          )}

          {/* =================================================
              MOVER BRANCA
          ================================================= */}

          {stage ===
            "moveWhite" && !positionDraft && (
            <div style={styles.card}>
              <StepHeader
                number="5"
                title="Mover branca"
              />

              <div
                style={styles.warning}
              >
                <strong>
                  MOVER BRANCA
                </strong>

                <br />

                Posição atual:{" "}
                <strong>
                  {whitePosition}
                </strong>

                <br />

                Selecione a nova posição.
              </div>

              <PositionMap
                selected={
                  newWhitePosition
                }
                onSelect={
                  selectNewWhitePosition
                }
              />

              <button
                disabled={
                  !newWhitePosition
                }
                onClick={
                  saveMoveWhite
                }
                style={{
                  ...styles.button,
                  ...styles.green,
                  width: "100%",
                  marginTop: 15,
                  opacity:
                    newWhitePosition
                      ? 1
                      : 0.5,
                }}
              >
                Confirmar mover branca
              </button>
            </div>
          )}

          {/* =================================================
              PLACAR DO END
          ================================================= */}

          {stage === "endScore" && (
            <EndScore draft={endScoreDraft} onDraftChange={value=>{pushUndoSnapshot();setEndScoreDraft(value);}}
              athlete={athlete}
              opponent={opponent}
              athleteColor={
                athleteColor
              }
              opponentColor={
                opponentColor
              }
              endName={
                currentEndName
              }
              onSave={
                saveEndScore
              }
            />
          )}

          <div className="scout-live-performance">
            <PartialPerformance plays={playsHistory} gameType={gameType} athlete={athlete} opponent={opponent} athleteColor={athleteColor} scoutMode={scoutMode} />
          </div>

          <MobileDisclosure always summary={<><Clock aria-hidden="true"/><strong>Histórico</strong><span className="history-quick">{playsHistory.length} jogadas</span></>}>
          <section className="scout-partial-history" aria-label="Histórico de jogadas da partida">
            <label>Histórico <select aria-label="Parcial do histórico" value={historyEndFilter} onChange={e=>setHistoryEndFilter(e.target.value)}><option>Atual</option><option>Geral</option>{[...new Set([...regularEnds,...playsHistory.map(p=>p.end)])].map(end=><option key={end}>{end}</option>)}</select></label>
            <div className="scout-partial-history-title">
              <div><strong>Jogadas da partida</strong><span>{historyEndFilter==='Atual'?currentEndName:historyEndFilter}</span></div>
              <b>{playsHistory.filter(p=>historyEndFilter==='Geral'||p.end===(historyEndFilter==='Atual'?currentEndName:historyEndFilter)).length}</b>
            </div>
            {playsHistory.filter(p=>historyEndFilter==='Geral'||p.end===(historyEndFilter==='Atual'?currentEndName:historyEndFilter)).length === 0 ? (
              <p>Nenhuma jogada registrada nesta parcial.</p>
            ) : (
              <div className="scout-partial-history-list">
                {[...playsHistory.filter(p=>historyEndFilter==='Geral'||p.end===(historyEndFilter==='Atual'?currentEndName:historyEndFilter))].reverse().map((play) => (
                  <div className={`scout-partial-history-item is-${play.color.toLowerCase()}`} key={play.id}>
                    <img src={playAsset(play.play)} alt="" />
                    <div>
                      <strong>{play.end} · {play.play}</strong>
                      <span className="scout-history-player">{play.playerName || (play.color === "Vermelho" ? redName : blueName)} · {play.color}</span>
                      <span>{play.ball} · {play.result} · Branca {positionLabel(play)} · Tempo: {formatDuration(durationOf(play))}</span>
                    </div>
                    <button type="button" onClick={() => removePlay(play.id)} aria-label={`Excluir jogada ${play.play}`}>Excluir</button>
                  </div>
                ))}
              </div>
            )}
          </section>
          </MobileDisclosure>


          <div className="scout-sticky-actions">
            <button
              onClick={undoLastAction}
              disabled={undoStack.length === 0}
              className="scout-undo-button"
            >
              <ArrowCounterClockwise aria-hidden="true" size={32}/> Desfazer
            </button>
            <div className="scout-last-action"><Clock aria-hidden="true" size={36}/>
              <small>Última ação</small><span className="scout-last-dash" aria-hidden="true">-</span>
              <strong>{lastRecordedPlay ? `${lastRecordedPlay.play} · ${lastRecordedPlay.result}` : "Nenhuma jogada registrada"}</strong>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // TELA FINAL
  // =========================================================

  const athleteMatchPlays = playsHistory.filter((p) => p.color === athleteColor);
  const opponentMatchPlays = playsHistory.filter((p) => p.color === opponentColor);
  const athleteMatchStats = calcStats(athleteMatchPlays);
  const opponentMatchStats = calcStats(opponentMatchPlays);
  const athleteMatchHeat = buildPositionPerformance(athleteMatchPlays);
  const athletePositionEntries = Object.entries(athleteMatchHeat);
  const athleteBestPosition = [...athletePositionEntries].sort((a,b) => b[1].efficiency - a[1].efficiency || b[1].total - a[1].total)[0];
  const athleteAttentionPosition = [...athletePositionEntries].sort((a,b) => b[1].errorRate - a[1].errorRate || b[1].total - a[1].total)[0];
  const opponentMatchHeat = buildPositionPerformance(opponentMatchPlays);
  const opponentPositionEntries = Object.entries(opponentMatchHeat);
  const opponentBestPosition = [...opponentPositionEntries].sort((a,b) => b[1].efficiency - a[1].efficiency || b[1].total - a[1].total)[0];
  const opponentAttentionPosition = [...opponentPositionEntries].sort((a,b) => b[1].errorRate - a[1].errorRate || b[1].total - a[1].total)[0];

  const finalRedName = athleteColor === "Vermelho" ? athlete : opponent;
  const finalBlueName = athleteColor === "Azul" ? athlete : opponent;
  const finalRedScore = athleteColor === "Vermelho" ? totalAthlete : totalOpponent;
  const finalBlueScore = athleteColor === "Azul" ? totalAthlete : totalOpponent;
  const finalShowingAthlete = finalSelectedSide === "athlete";
  const finalName = finalShowingAthlete ? athlete : opponent;
  const finalColor = finalShowingAthlete ? athleteColor : opponentColor;
  const finalStats = finalShowingAthlete ? athleteMatchStats : opponentMatchStats;
  const finalPlays = finalShowingAthlete ? athleteMatchPlays : opponentMatchPlays;
  const finalBest = finalColor === "Vermelho" ? redBest : blueBest;
  const finalRanking = finalColor === "Vermelho" ? redRanking : blueRanking;
  const colorHex = (color) => color === "Vermelho" ? "#ef4148" : "#1680f4";
  const endTone = (score) => {
    const a = Number(score.athlete || 0);
    const o = Number(score.opponent || 0);
    if (a === o) return "#facc15";
    return a > o ? colorHex(athleteColor) : colorHex(opponentColor);
  };
  const tieBreakWinner = getTieBreakWinnerFromScores(scores);
  const winnerName = totalAthlete > totalOpponent
    ? athlete
    : totalOpponent > totalAthlete
      ? opponent
      : tieBreakWinner === "athlete" ? athlete : tieBreakWinner === "opponent" ? opponent : "Empate";

  return (
    <div className="scout-final-page">
      <section className="scout-final-hero">
        <div className="scout-final-topbar">
          <button type="button" onClick={newGame} aria-label="Voltar">←</button>
          <strong>Detalhes da partida</strong>
          <span aria-hidden="true">⋮</span>
        </div>
        <div className="scout-final-brand">
          <img src="/bocha-scout-emblem.png" alt="" />
          <strong>BOCHA <span>SCOUT</span></strong>
          <small>ANÁLISE · INCLUSÃO · MAIS JOGO</small>
        </div>
        <div className="scout-final-scoreboard">
          <div className="scout-final-player" style={{ color: colorHex("Azul") }}>
            <img src="/scout-assets/blue-ball.png" alt="" />
            <strong>{finalBlueName}</strong><span>AZUL</span>
          </div>
          <div className="scout-final-score">{finalBlueScore}<span>×</span>{finalRedScore}</div>
          <div className="scout-final-player" style={{ color: colorHex("Vermelho") }}>
            <img src="/scout-assets/red-ball.png" alt="" />
            <strong>{finalRedName}</strong><span>VERMELHO</span>
          </div>
        </div>
        <div className="scout-final-winner">{winnerName === "Empate" ? "Partida empatada" : `${winnerName} venceu${tieBreakWinner ? " no tie-break" : ""}`}</div>
        <div className="scout-final-ends">
          {Object.entries(scores).map(([name, score]) => {
            const blueEndScore = athleteColor === "Azul" ? score.athlete : score.opponent;
            const redEndScore = athleteColor === "Vermelho" ? score.athlete : score.opponent;
            return <div key={name} style={{ borderColor: endTone(score) }}><span>{name.replace("End ", "E")}</span><strong style={{ color: endTone(score) }}>{blueEndScore} – {redEndScore}</strong></div>;
          })}
        </div>
      </section>

      <main className="scout-final-content">
        <div className="scout-final-tabs">
          <button className={finalShowingAthlete ? "is-active" : ""} style={{ color: finalShowingAthlete ? "#fff" : colorHex(athleteColor), background: finalShowingAthlete ? colorHex(athleteColor) : "transparent" }} onClick={() => setFinalSelectedSide("athlete")}>{athlete}</button>
          <button className={!finalShowingAthlete ? "is-active" : ""} style={{ color: !finalShowingAthlete ? "#fff" : colorHex(opponentColor), background: !finalShowingAthlete ? colorHex(opponentColor) : "transparent" }} onClick={() => setFinalSelectedSide("opponent")}>{opponent}</button>
        </div>
        <h2>Desempenho de {finalName}</h2>
        <div className="scout-final-metrics">
          <div><span>Eficiência</span><strong>{finalStats.efficiency.toFixed(1)}%</strong><small>{finalStats.acertos} de {finalStats.total} bolas</small></div>
          <div><span>Acertos</span><strong>{finalStats.acertos}</strong><small>bolas no alvo</small></div>
          <div><span>Erros</span><strong>{finalStats.erros}</strong><small>{finalStats.erros === 1 ? "bola fora" : "bolas fora"}</small></div>
        </div>
        <button type="button" className="scout-final-row" onClick={() => setFinalDetailPanel((value) => value === "heatmap" ? "" : "heatmap")}>
          <div className="scout-final-row-icon"><img src="/scout-assets/zone.png" alt="" /></div>
          <div><strong>Mapa de calor</strong><span>{finalColor} · {finalName}</span><small>Veja onde as bolas foram jogadas durante a partida.</small></div><b>›</b>
        </button>
        {finalDetailPanel === "heatmap" && <div className="scout-final-expanded"><HistoricalHeatmap plays={finalPlays} name={finalName} color={finalColor} /></div>}
        <button type="button" className="scout-final-row" onClick={() => setFinalDetailPanel((value) => value === "fundamentals" ? "" : "fundamentals")}>
          <div className="scout-final-row-icon"><img src="/scout-assets/approach.png" alt="" /></div>
          <div><strong>Fundamentos</strong><span>{finalBest ? `${finalBest[0]} · melhor desempenho` : "Sem jogadas registradas"}</span><small>Análise completa por fundamento.</small></div><b>›</b>
        </button>
        {finalDetailPanel === "fundamentals" && (
          <div className="scout-final-expanded scout-final-foundation-list">
            {finalRanking.length === 0 ? <p>Nenhuma jogada registrada.</p> : finalRanking.map(([play, data]) => (
              <div key={play}><img src={playAsset(play)} alt="" /><span><strong>{play}</strong><small>{data.total} jogada(s) · {data.acertos} acerto(s) · {data.erros} erro(s)</small></span><b>{data.efficiency.toFixed(1)}%</b></div>
            ))}
          </div>
        )}
        <button type="button" className="scout-final-pdf" onClick={exportMatchReport}>Gerar PDF <span>Relatório completo da partida</span></button>
        <button type="button" className="scout-final-new" onClick={newGame}>Nova partida</button>
      </main>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div
          style={{
            ...styles.card,
            textAlign: "center",
          }}
        >
          <h1>
            Partida finalizada
          </h1>

          <div
            style={
              styles.finalScore
            }
          >
            {totalAthlete} ×{" "}
            {totalOpponent}
          </div>

          <h2>
            {athlete} ×{" "}
            {opponent}
          </h2>

          <h2>
            Resultado técnico da partida
          </h2>

          <StatsPanel stats={athleteMatchStats} />

          <div style={styles.grid2}>
            <InfoBox title="Melhor posição" value={athleteBestPosition ? `${athleteBestPosition[0]} · ${athleteBestPosition[1].efficiency.toFixed(1)}%` : "—"} />
            <InfoBox title="Posição de atenção" value={athleteAttentionPosition ? `${athleteAttentionPosition[0]} · ${athleteAttentionPosition[1].errorRate.toFixed(1)}% erro` : "—"} />
          </div>

          <div
            style={{
              textAlign: "left",
              marginTop: 20,
            }}
          >
            <h3>Parciais</h3>

            {Object.entries(scores).map(
              ([name, s]) => (
                <div
                  key={name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 0",
                    borderBottom:
                      "1px solid rgba(0,0,0,0.08)",
                    fontSize: 14,
                  }}
                >
                  <span>{name}</span>
                  <span>
                    {s.athlete} × {s.opponent}
                    {s.winner === "Empate"
                      ? " · empate"
                      : ""}
                  </span>
                </div>
              )
            )}

            <p style={{ marginTop: 12 }}>
              Melhor End de{" "}
              <strong>{athlete}</strong>:{" "}
              <strong>
                {bestEnd.athlete
                  ? `${bestEnd.athlete.name} (+${bestEnd.athlete.diff})`
                  : "-"}
              </strong>
            </p>

            <p>
              Melhor End de{" "}
              <strong>{opponent}</strong>:{" "}
              <strong>
                {bestEnd.opponent
                  ? `${bestEnd.opponent.name} (+${bestEnd.opponent.diff})`
                  : "-"}
              </strong>
            </p>
          </div>

          <div
            style={
              styles.grid2
            }
          >
            <ColorScoutSummary
              color="Vermelho"
              stats={
                stats.vermelho
              }
              best={
                redBest
              }
              worst={
                redWorst
              }
              ranking={
                redRanking
              }
            />

            <ColorScoutSummary
              color="Azul"
              stats={
                stats.azul
              }
              best={
                blueBest
              }
              worst={
                blueWorst
              }
              ranking={
                blueRanking
              }
            />

          </div>

          <div style={{ ...styles.card, textAlign: "left", marginTop: 20 }}>
            <h2>Mapa de calor da partida — {athlete}</h2>
            <p style={styles.helpText}>Somente as jogadas do atleta nesta partida.</p>
            <HistoricalHeatmap plays={athleteMatchPlays} name={athlete} color={athleteColor} />
          </div>

          <button
            onClick={() => setShowFinalDetails((value) => !value)}
            style={{
              ...styles.button,
              background: "#0f172a",
              width: "100%",
              marginTop: 10,
            }}
          >
            {showFinalDetails ? "Ocultar detalhes" : "Mais detalhes"}
          </button>

          {showFinalDetails && (
            <div style={{ ...styles.card, textAlign: "left", marginTop: 14 }}>
              <h2>Comparativo técnico da partida</h2>
              <div style={styles.grid2}>
                <div style={styles.info}>
                  <strong>{athlete}</strong><br />
                  Melhor posição: {athleteBestPosition ? `${athleteBestPosition[0]} · ${athleteBestPosition[1].efficiency.toFixed(1)}%` : "—"}<br />
                  Posição de atenção: {athleteAttentionPosition ? `${athleteAttentionPosition[0]} · ${athleteAttentionPosition[1].errorRate.toFixed(1)}% erro` : "—"}<br />
                  Precisão: {athleteMatchStats.accuracy.toFixed(1)}% · Eficiência: {athleteMatchStats.efficiency.toFixed(1)}%
                </div>
                <div style={styles.info}>
                  <strong>{opponent}</strong><br />
                  Melhor posição: {opponentBestPosition ? `${opponentBestPosition[0]} · ${opponentBestPosition[1].efficiency.toFixed(1)}%` : "—"}<br />
                  Posição de atenção: {opponentAttentionPosition ? `${opponentAttentionPosition[0]} · ${opponentAttentionPosition[1].errorRate.toFixed(1)}% erro` : "—"}<br />
                  Precisão: {opponentMatchStats.accuracy.toFixed(1)}% · Eficiência: {opponentMatchStats.efficiency.toFixed(1)}%
                </div>
              </div>
              <h3 style={{ marginTop: 18 }}>Mapa de calor do adversário — {opponent}</h3>
              <HistoricalHeatmap plays={opponentMatchPlays} name={opponent} color={opponentColor} />
            </div>
          )}

          <button
            onClick={newGame}
            style={{
              ...styles.button,
              background:
                "#2563eb",
              width: "100%",
              marginTop: 10,
            }}
          >
            Nova partida
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

function LivePerformancePanel({
  endName, athlete, opponent, athleteColor, opponentColor,
  athleteEnd, opponentEnd, athleteMatch, opponentMatch,
}) {
  const metricCell = (stats) => (
    <div style={{ display: "grid", gap: 2, textAlign: "center" }}>
      <strong style={{ fontSize: 14 }}>{stats.accuracy.toFixed(0)}%</strong>
      <span style={{ fontSize: 10, color: "#64748b" }}>precisão</span>
      <strong style={{ fontSize: 14 }}>{stats.efficiency.toFixed(0)}%</strong>
      <span style={{ fontSize: 10, color: "#64748b" }}>eficiência</span>
      <span style={{ fontSize: 10, color: "#64748b" }}>{stats.total} jogada(s)</span>
    </div>
  );

  return (
    <div style={{ ...styles.card, padding: 12, marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".04em", color: "#334155", marginBottom: 8 }}>
        Desempenho ao vivo
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(80px,.9fr) 1fr 1fr", gap: 8, alignItems: "center" }}>
        <div />
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: athleteColor === "Vermelho" ? "#b91c1c" : "#1d4ed8" }}>{athlete}</div>
        <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, color: opponentColor === "Vermelho" ? "#b91c1c" : "#1d4ed8" }}>{opponent}</div>

        <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>{endName}<br /><span style={{ color: "#64748b", fontWeight: 700 }}>parcial atual</span></div>
        {metricCell(athleteEnd)}
        {metricCell(opponentEnd)}

        <div style={{ gridColumn: "1 / -1", borderTop: "1px solid #e2e8f0", margin: "2px 0" }} />

        <div style={{ fontSize: 11, fontWeight: 900, color: "#0f172a" }}>Partida<br /><span style={{ color: "#64748b", fontWeight: 700 }}>acumulado</span></div>
        {metricCell(athleteMatch)}
        {metricCell(opponentMatch)}
      </div>
    </div>
  );
}

function Heatmap({ color, counts }) {
  const isRed = color === "Vermelho";

  const max = Math.max(
    1,
    ...Object.values(counts || {}).map(Number)
  );

  const total = Object.values(counts || {}).reduce(
    (sum, v) => sum + Number(v),
    0
  );

  return (
    <div
      style={{
        background: isRed ? "#fef2f2" : "#eff6ff",
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        textAlign: "left",
      }}
    >
      <h3>
        {color} · Mapa de calor
      </h3>

      <p style={{ fontSize: 13, opacity: 0.7 }}>
        {total} jogada(s) registrada(s) por posição da branca.
      </p>

      <div style={styles.map}>
        {POSITIONS.map((position, index) => {
          if (position === null) {
            return (
              <div
                key={`heat-empty-${index}`}
                style={styles.positionEmpty}
              />
            );
          }

          const count = counts?.[position] || 0;
          const intensity = count / max;

          return (
            <div
              key={`heat-${position}`}
              style={{
                ...styles.position,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "default",
                background:
                  count === 0
                    ? "#f1f5f9"
                    : isRed
                    ? `rgba(220,38,38,${0.15 + intensity * 0.85})`
                    : `rgba(37,99,235,${0.15 + intensity * 0.85})`,
                color:
                  intensity > 0.6 ? "#fff" : "#0f172a",
                fontSize: 11,
              }}
            >
              <span>{position}</span>
              {count > 0 && (
                <strong style={{ fontSize: 13 }}>
                  {count}
                </strong>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function Header({
  athlete,
  opponent,
  athleteColor,
  opponentColor,
  currentEnd,
}) {
  return (
    <div
      style={{
        ...styles.card,
        padding: 15,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <strong>
            BOCHA SCOUT
          </strong>

          <div
            style={{
              color: "#64748b",
              fontSize: 13,
            }}
          >
            {currentEnd}
          </div>
        </div>

        <div
          style={{
            textAlign: "right",
            fontSize: 13,
          }}
        >
          <div>
            {athleteColor}{" "}
            {athlete}
          </div>

          <div>
            {opponentColor}{" "}
            {opponent}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepHeader({
  number,
  title,
}) {
  return (
    <div className="scout-step-heading"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "#2563eb",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
        }}
      >
        {number}
      </div>

      <h2
        style={{
          margin: 0,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

function Field({
  label,
  children,
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontWeight: "bold",
          marginBottom: 6,
        }}
      >
        {label}
      </label>

      {children}
    </div>
  );
}

function PositionMap({ selected, onSelect }) {
  return <CourtPositionMap selected={selected} onSelect={onSelect} />;
}

function ResultBadge({
  result,
}) {
  const config = {
    Acerto: {
      bg: "#dcfce7",
      color: "#166534",
      icon: "",
    },

    Funcional: {
      bg: "#ffedd5",
      color: "#9a3412",
      icon: "",
    },

    Erro: {
      bg: "#fee2e2",
      color: "#991b1b",
      icon: "",
    },
  };

  const item =
    config[result];

  return (
    <span
      style={{
        background:
          item.bg,
        color:
          item.color,
        padding:
          "5px 9px",
        borderRadius: 20,
        fontWeight:
          "bold",
        fontSize: 12,
        whiteSpace:
          "nowrap",
      }}
    >
      {item.icon}{" "}
      {result}
    </span>
  );
}

function StatsPanel({
  stats,
}) {
  return (
    <div
      style={
        styles.statGrid
      }
    >
      <Stat
        title="Jogadas"
        value={
          stats.total
        }
      />

      <Stat
        title="Acertos"
        value={
          stats.acertos
        }
      />

      <Stat
        title="Funcionais"
        value={
          stats.funcionais
        }
      />

      <Stat
        title="Erros"
        value={
          stats.erros
        }
      />

      <Stat
        title="Eficiência"
        value={`${stats.efficiency.toFixed(
          1
        )}%`}
      />

      <Stat
        title="Precisão"
        value={`${stats.accuracy.toFixed(
          1
        )}%`}
      />

      <Stat
        title="Taxa de erro"
        value={`${stats.errorRate.toFixed(
          1
        )}%`}
      />
    </div>
  );
}

function Stat({
  title,
  value,
}) {
  return (
    <div style={styles.stat}>
      <div
        style={
          styles.statTitle
        }
      >
        {title}
      </div>

      <strong
        style={
          styles.statValue
        }
      >
        {value}
      </strong>
    </div>
  );
}

function MiniStat({
  label,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#f8fafc",
        border:
          "1px solid #e2e8f0",
        padding: 10,
        borderRadius: 10,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: "#64748b",
        }}
      >
        {label}
      </div>

      <strong
        style={{
          fontSize: 20,
        }}
      >
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// SCOUT POR COR
// ============================================================

function ColorScout({
  color,
  stats,
  ranking,
  best,
  worst,
}) {
  const isRed =
    color === "Vermelho";

  return (
    <div
      style={{
        ...styles.card,

        borderTop: `6px solid ${
          isRed
            ? "#dc2626"
            : "#2563eb"
        }`,
      }}
    >
      <h2>
        {isRed
          ? "Scout Vermelho"
          : "Scout Azul"}
      </h2>

      <StatsPanel
        stats={stats}
      />

      <div
        style={{
          ...styles.liveGrid,
          marginTop: 15,
        }}
      >
        <InfoBox
          title="Mais utilizado"
          value={
            ranking.length
              ? `${ranking[0][0]} (${ranking[0][1].total}x)`
              : "-"
          }
        />

        <InfoBox
          title="Melhor fundamento"
          value={
            best
              ? `${best[0]} (${best[1].efficiency.toFixed(
                  1
                )}%)`
              : "-"
          }
        />

        <InfoBox
          title="Mais erros"
          value={
            worst
              ? `${worst[0]} (${worst[1].errorRate.toFixed(
                  1
                )}%)`
              : "-"
          }
        />
      </div>

      <h3
        style={{
          marginTop: 20,
        }}
      >
        Fundamentos utilizados
      </h3>

      {ranking.length === 0 ? (
        <p style={styles.empty}>
          Nenhuma jogada registrada.
        </p>
      ) : (
        ranking.map(
          ([play, data], index) => (
            <div
              key={play}
              style={
                styles.ranking
              }
            >
              <div>
                <strong>
                  {index + 1}º{" "}
                  {play}
                </strong>

                <div
                  style={{
                    fontSize: 12,
                    color:
                      "#64748b",
                    marginTop: 4,
                  }}
                >
                  {data.total}{" "}
                  execuções •{" "}
                  {data.acertos}{" "}
                  acertos •{" "}
                  {data.erros}{" "}
                  erros
                </div>
              </div>

              <strong>
                {data.efficiency.toFixed(
                  1
                )}
                %
              </strong>
            </div>
          )
        )
      )}
    </div>
  );
}

function ColorScoutSummary({
  color,
  stats,
  best,
  worst,
  ranking = [],
}) {
  const isRed =
    color === "Vermelho";

  const [open, setOpen] =
    useState(false);

  return (
    <div
      onClick={() =>
        setOpen((v) => !v)
      }
      style={{
        background:
          isRed
            ? "#fef2f2"
            : "#eff6ff",
        borderRadius: 15,
        padding: 20,
        marginTop: 20,
        cursor: "pointer",
        textAlign: "left",
      }}
    >

      <h3>
        {isRed
          ? "Vermelho"
          : "Azul"}{" "}
        <span
          style={{
            fontSize: 13,
            fontWeight: 400,
            opacity: 0.7,
          }}
        >
          {open
            ? "(toque para recolher)"
            : "(toque para ver detalhes)"}
        </span>
      </h3>

      <p>
        Eficiência:{" "}
        <strong>
          {stats.efficiency.toFixed(
            1
          )}
          %
        </strong>
      </p>

      <p>
        Acertos:{" "}
        <strong>
          {stats.acertos}
        </strong>
      </p>

      <p>
        Erros:{" "}
        <strong>
          {stats.erros}
        </strong>
      </p>

      <p>
        Melhor fundamento:{" "}
        <strong>
          {best
            ? best[0]
            : "-"}
        </strong>
      </p>

      <p>
        Maior erro:{" "}
        <strong>
          {worst
            ? worst[0]
            : "-"}
        </strong>
      </p>

      {open && (
        <div style={{ marginTop: 15 }}>
          <StatsPanel stats={stats} />

          <h4 style={{ marginTop: 15 }}>
            Fundamentos
          </h4>

          {ranking.length === 0 && (
            <p>Nenhuma jogada registrada.</p>
          )}

          {ranking.map(
            ([name, data]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 10,
                  padding: "6px 0",
                  borderBottom:
                    "1px solid rgba(0,0,0,0.08)",
                  fontSize: 14,
                }}
              >
                <span>{name}</span>
                <span>
                  {data.total}x · {data.acertos} acertos · {data.erros} erros ·{" "}
                  {data.efficiency.toFixed(
                    1
                  )}
                  %
                </span>
              </div>
            )
          )}
        </div>
      )}
    </div>

  );
}

// ============================================================
// PLACAR DO END
// ============================================================

function EndScore({athlete,opponent,athleteColor,opponentColor,endName,onSave,draft,onDraftChange}) {
  const athleteScore=draft.athlete;
  const opponentScore=draft.opponent;
  const setAthleteScore=(value)=>onDraftChange({...draft,athlete:value});
  const setOpponentScore=(value)=>onDraftChange({...draft,opponent:value});

  return (
    <div
      style={{
        ...styles.card,
        border:
          "3px solid #f97316",
      }}
    >
      <div
        style={{
          textAlign:
            "center",
        }}
      >
        <div
          style={{
            fontSize: 35,
          }}
        >
          
        </div>

        <h2>
          {endName}
          {" "}
          finalizado
        </h2>

        <p style={styles.helpText}>
          As 12 bolas deste End foram
          registradas. Informe o placar
          da parcial.
        </p>
      </div>

      <div
        style={styles.grid2}
      >
        {(athleteColor === "Azul"
          ? [
              { color: athleteColor, name: athlete, value: athleteScore, setValue: setAthleteScore },
              { color: opponentColor, name: opponent, value: opponentScore, setValue: setOpponentScore },
            ]
          : [
              { color: opponentColor, name: opponent, value: opponentScore, setValue: setOpponentScore },
              { color: athleteColor, name: athlete, value: athleteScore, setValue: setAthleteScore },
            ]
        ).map((side) => (
          <Field key={side.color} label={`${side.color} ${side.name}`}>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={side.value}
              onChange={(e) => side.setValue(e.target.value)}
              style={styles.scoreInput}
            />
          </Field>
        ))}
      </div>

      <button
        onClick={() =>
          onSave(
            athleteScore,
            opponentScore
          )
        }
        style={{
          ...styles.button,
          ...styles.green,
          width: "100%",
          marginTop: 15,
        }}
      >
        {String(endName).startsWith("Tie-Break") ? "Salvar Tie-Break" : "Salvar End e iniciar próximo"}
      </button>
    </div>
  );
}

function InfoBox({
  title,
  value,
}) {
  return (
    <div
      style={
        styles.infoBox
      }
    >
      <div
        style={
          styles.infoBoxTitle
        }
      >
        {title}
      </div>

      <strong>
        {value}
      </strong>
    </div>
  );
}

// ============================================================
// ESTILOS
// ============================================================

const styles = {
  page: {
    minHeight:
      "100vh",
    background:
      "linear-gradient(180deg,#f8fafc 0%,#eef2f6 100%)",
    padding: 12,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
  },

  container: {
    maxWidth: 1180,
    margin:
      "0 auto",
  },

  title: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: "0.04em",
    color: "#ffffff",
    marginBottom: 4,
  },

  subtitle: {
    color:
      "#cbd5e1",
    margin: 0,
  },

  brandHeader: {
    background: "#0f172a",
    color: "white",
    borderRadius: 16,
    padding: "18px clamp(16px,3vw,26px)",
    marginBottom: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
    boxShadow: "0 4px 14px rgba(15,23,42,0.12)",
  },

  brandTag: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.12em",
    color: "#cbd5e1",
  },

  card: {
    background:
      "white",
    borderRadius: 16,
    padding: "clamp(14px,2.4vw,22px)",
    marginBottom: 15,
    boxShadow:
      "0 8px 24px rgba(15,23,42,0.06)",
    border: "1px solid #e2e8f0",
  },

  grid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(190px,1fr))",
    gap: 12,
  },

  grid2: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(210px,1fr))",
    gap: 12,
  },

  input: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding: "12px 13px",
    border:
      "1px solid #cbd5e1",
    borderRadius: 12,
    minHeight: 46,
    fontSize: 16,
    background:
      "white",
  },

  button: {
    border:
      "none",
    borderRadius: 10,
    padding:
      "11px 15px",
    minHeight: 44,
    color:
      "white",
    fontWeight:
      700,
    cursor:
      "pointer",
    fontSize: 14,
    letterSpacing: "0.01em",
  },

  green: {
    background:
      "#15803d",
  },

  scoreCard: {
    background:
      "#0f172a",
    color:
      "white",
    borderRadius: 12,
    padding: 20,
    display:
      "flex",
    justifyContent:
      "center",
    alignItems:
      "center",
    gap: 24,
    flexWrap: "wrap",
    textAlign:
      "center",
    marginBottom: 15,
  },

  bigScore: {
    fontSize: "clamp(34px,7vw,48px)",
    fontWeight:
      "bold",
  },

  vs: {
    fontSize: 28,
  },

  info: {
    background:
      "#eff6ff",
    border:
      "1px solid #93c5fd",
    padding: 12,
    borderRadius: 12,
    marginTop: 15,
  },

  helpText: {
    color:
      "#64748b",
    fontSize: 14,
  },

  map: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(6,1fr)",
    gap: 5,
    marginTop: 15,
  },

  position: {
    height: 48,
    border:
      "none",
    borderRadius: 9,
    background:
      "#dcfce7",
    fontWeight:
      "bold",
    cursor:
      "pointer",
  },

  positionSelected: {
    background:
      "#facc15",
    boxShadow:
      "0 0 0 3px #eab308",
  },

  positionEmpty: {
    background:
      "transparent",
    borderRadius: 9,
    height: 48,
  },

  warning: {
    background:
      "#ffedd5",
    border:
      "1px solid #fb923c",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },

  colorGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(140px,1fr))",
    gap: 12,
    marginTop: 15,
  },

  colorButton: {
    border:
      "none",
    color:
      "white",
    borderRadius: 16,
    padding: 22,
    minHeight: 120,
    display:
      "flex",
    flexDirection:
      "column",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 7,
    fontSize: 22,
    cursor:
      "pointer",
  },

  selectedInfo: {
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  resultGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(105px,1fr))",
    gap: 10,
  },

  resultBig: {
    border:
      "none",
    color:
      "white",
    borderRadius: 14,
    minHeight: 110,
    fontSize: 20,
    display:
      "flex",
    flexDirection:
      "column",
    alignItems:
      "center",
    justifyContent:
      "center",
    gap: 8,
    cursor:
      "pointer",
  },

  playGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(145px,1fr))",
    gap: 8,
  },

  playButton: {
    padding: 14,
    border:
      "1px solid #cbd5e1",
    borderRadius: 11,
    background:
      "white",
    cursor:
      "pointer",
    fontWeight:
      "bold",
    minHeight: 55,
  },

  playDisabled: {
    background:
      "#e2e8f0",
    color:
      "#94a3b8",
    cursor:
      "not-allowed",
  },

  ballCounter: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(2,1fr)",
    gap: 10,
  },

  counter: {
    borderRadius: 14,
    padding: 14,
    display:
      "flex",
    flexDirection:
      "column",
    alignItems:
      "center",
    gap: 4,
    fontSize: 22,
  },

  statGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(120px,1fr))",
    gap: 8,
  },

  stat: {
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 12,
  },

  statTitle: {
    color:
      "#64748b",
    fontSize: 12,
  },

  statValue: {
    fontSize: 23,
  },

  liveGrid: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(180px,1fr))",
    gap: 8,
  },

  infoBox: {
    background:
      "#f8fafc",
    border:
      "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 13,
  },

  infoBoxTitle: {
    color:
      "#64748b",
    fontSize: 12,
    marginBottom: 6,
  },

  miniStats: {
    display:
      "grid",
    gridTemplateColumns:
      "repeat(3,1fr)",
    gap: 8,
    marginBottom: 15,
  },

  ranking: {
    display:
      "flex",
    justifyContent:
      "space-between",
    alignItems:
      "center",
    gap: 10,
    padding: 12,
    borderBottom:
      "1px solid #e2e8f0",
  },

  table: {
    width:
      "100%",
    borderCollapse:
      "collapse",
    fontSize: 13,
  },

  delete: {
    border:
      "none",
    background:
      "#fee2e2",
    color:
      "#b91c1c",
    padding:
      "6px 9px",
    borderRadius: 8,
    cursor:
      "pointer",
  },

  scoreInput: {
    width:
      "100%",
    boxSizing:
      "border-box",
    padding: 14,
    border:
      "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 28,
    fontWeight:
      "bold",
    textAlign:
      "center",
  },

  finalScore: {
    fontSize: 50,
    fontWeight:
      "bold",
    margin: 20,
  },

  empty: {
    color:
      "#94a3b8",
    textAlign:
      "center",
    padding: 15,
  },
};
