// @ts-nocheck
/* eslint-disable */
import { useEffect, useMemo, useState } from "react";
// PATCH: heatmap-v2
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

function playAsset(play) {
  if (play === "Aproximação") return "/scout-assets/approach.png";
  if (play === "Batida") return "/scout-assets/hit.png";
  if (play === "Aérea") return "/scout-assets/aerial.png";
  if (play.includes("Tirar")) return "/scout-assets/remove.png";
  if (play.includes("Dobrar") || play.includes("Sobrepor")) return "/scout-assets/overlap.png";
  return "/scout-assets/defense.png";
}

const RESULTS = ["Acerto", "Funcional", "Erro"];

const POSITIONS = [
  null, null, "14", "13", null, null,
  null, "25", "24", "23", "22", null,
  "36", "35", "34", "33", "32", "31",
  "46", "45", "44", "43", "42", "41",
  "56", "55", "54", "53", "52", "51",
  "66", "65", "64", "63", "62", "61",
  "76", "75", "74", "73", "72", "71",
  "86", "85", "84", "83", "82", "81",
  "96", "95", "94", "93", "92", "91", "TB",
];

function getRegularEnds(gameType) {
  const total =
    (gameType === "Equipes" || gameType === "Equipe BC1/BC2") ? 6 : 4;

  return Array.from(
    { length: total },
    (_, i) => `End ${i + 1}`
  );
}

function calcStats(data) {
  const total = data.length;
  const acertos = data.filter((p) => p.result === "Acerto").length;
  const funcionais = data.filter((p) => p.result === "Funcional").length;
  const erros = data.filter((p) => p.result === "Erro").length;

  return {
    total,
    acertos,
    funcionais,
    erros,
    efficiency: total === 0 ? 0 : ((acertos + funcionais * 0.5) / total) * 100,
    accuracy: total === 0 ? 0 : (acertos / total) * 100,
    errorRate: total === 0 ? 0 : (erros / total) * 100,
  };
}

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
    item.total += 1;
    if (p.result === "Acerto") item.acertos += 1;
    if (p.result === "Funcional") item.funcionais += 1;
    if (p.result === "Erro") item.erros += 1;
    if (p.play === "Saída de jogo") item.saidas += 1;
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
  return new Date().toISOString().slice(0, 10);
}

function formatDateBR(iso) {
  if (!iso) return "-";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}


function AthleteCombobox({ items, value, onChange, query, setQuery, favoriteIds = [], onToggleFavorite, placeholder = "🔎 Digite ou role a lista", allowAll = false }) {
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
      <input
        value={query}
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        placeholder={placeholder}
        autoComplete="off"
        style={styles.input}
      />
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
                  {fav ? "★" : "☆"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopNav({ view, setView, isSuperAdmin = false }) {
  const items = [
    ["dashboard", "Início"],
    ["history", "Histórico"],
    ["athletes", "Atletas"],
    ...(isSuperAdmin ? [["data", "Dados"]] : []),
  ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 15, position: "sticky", top: 8, zIndex: 30, background: "rgba(255,255,255,.94)", backdropFilter: "blur(10px)", padding: 8, border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>
      {items.map(([id, label]) => (
        <button
          key={id}
          onClick={() => setView(id)}
          style={{
            ...styles.button,
            background: view === id ? "#0f172a" : "#64748b",
            padding: "10px 14px",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
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

function DashboardScreen({ sessions, athletes, onNewTraining, onNewCompetition, onHistory }) {
  const [classFilter, setClassFilter] = useState("Todos");
  const [genderFilter, setGenderFilter] = useState("Todos");

  const visibleSessions = sessions.filter((s) => {
    const classOk = classFilter === "Todos" || s.athleteClass === classFilter || s.opponentClass === classFilter;
    const genderOk = genderFilter === "Todos" || s.athleteGender === genderFilter || s.opponentGender === genderFilter;
    return classOk && genderOk;
  });

  const performanceRows = visibleSessions.map((s) => ({
    session: s,
    efficiency: Number(s.stats?.efficiency ?? calcStats(getAthletePlays(s)).efficiency ?? 0),
  }));
  const best = [...performanceRows].sort((a, b) => b.efficiency - a.efficiency)[0];
  const worst = [...performanceRows].sort((a, b) => a.efficiency - b.efficiency)[0];

  const classCount = {};
  visibleSessions.forEach((s) => {
    if (!s.athleteClass) return;
    classCount[s.athleteClass] = (classCount[s.athleteClass] || 0) + 1;
  });
  const mostAnalyzedClass = Object.entries(classCount).sort((a, b) => b[1] - a[1])[0];
  const last = [...visibleSessions].sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))[0];

  return (
    <>
      <div style={styles.card}>
        <h2 style={{ marginBottom: 4 }}>Visão geral</h2>
        <p style={{ ...styles.helpText, marginTop: 0 }}>Escolha o tipo de scout para iniciar. A seleção não será pedida novamente durante o cadastro da partida.</p>

        <div style={{ ...styles.grid, marginBottom: 14 }}>
          <Field label="Classe">
            <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} style={styles.input}>
              <option>Todos</option>
              {CLASSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Gênero">
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} style={styles.input}>
              <option>Todos</option>
              {GENDERS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
        </div>

        <div style={styles.miniStats}>
          <MiniStat label="Total de scouts" value={visibleSessions.length} />
          <MiniStat label="Melhor desempenho" value={best ? best.efficiency.toFixed(1) + "%" : "—"} />
          <MiniStat label="Pior desempenho" value={worst ? worst.efficiency.toFixed(1) + "%" : "—"} />
          <MiniStat label="Classe mais analisada" value={mostAnalyzedClass ? mostAnalyzedClass[0] + " · " + mostAnalyzedClass[1] : "—"} />
          <MiniStat label="Último scout" value={last ? formatDateBR(last.date) : "—"} />
        </div>

        {(best || worst || last) && (
          <div style={{ ...styles.grid, marginTop: 14 }}>
            <InfoBox title="Melhor" value={best ? best.session.athlete + " · " + best.efficiency.toFixed(1) + "%" : "—"} />
            <InfoBox title="Ponto de atenção" value={worst ? worst.session.athlete + " · " + worst.efficiency.toFixed(1) + "%" : "—"} />
            <InfoBox title="Última análise" value={last ? last.athlete + " × " + last.opponent : "—"} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10, marginTop: 16 }}>
          <button onClick={onNewTraining} style={{ ...styles.button, ...styles.green }}>Novo Scout · Treino</button>
          <button onClick={onNewCompetition} style={{ ...styles.button, background: "#2563eb" }}>Novo Scout · Campeonato</button>
          <button onClick={onHistory} style={{ ...styles.button, background: "#475569" }}>Ver Histórico</button>
        </div>
      </div>
    </>
  );
}

function AthletesScreen({ athletes, sessions, onAdd, onDelete, onBack }) {
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

      <div style={styles.card}>
        <h2>Atletas cadastrados ({athletes.length})</h2>
        {athletes.length === 0 ? (
          <p style={styles.empty}>Nenhum atleta cadastrado ainda.</p>
        ) : athletes.map((a) => {
          const athleteSessions = sessions.filter((s) => s.athleteId === a.id);
          const stats = calcStats(athleteSessions.flatMap((s) => getAthletePlays(s)));
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
            </div>
          );
        })}
      </div>
      <button onClick={onBack} style={{ ...styles.button, background: "#475569", width: "100%" }}>Voltar</button>
    </>
  );
}

function SessionDetail({ item, onClose, onExportPdf, selectedAthleteId }) {
  const selectedIsOpponent = selectedAthleteId && selectedAthleteId !== "Todos" && item.opponentId === selectedAthleteId;
  const targetColor = selectedIsOpponent
    ? (item.athleteColor === "Vermelho" ? "Azul" : "Vermelho")
    : item.athleteColor;
  const analyzedName = selectedIsOpponent ? item.opponent : item.athlete;
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
        {formatDateBR(item.date)} · {item.sessionKind} · {item.gameType}
        {item.competitionName ? ` · ${item.competitionName}` : ""}{item.competitionPhase ? ` · ${item.competitionPhase}` : ""}
      </p>
      <div style={styles.miniStats}>
        <MiniStat label="Placar" value={`${item.totalAthlete} × ${item.totalOpponent}`} />
        <MiniStat label="Jogadas" value={item.stats?.total ?? 0} />
        <MiniStat label="Eficiência" value={`${Number(item.stats?.efficiency || 0).toFixed(1)}%`} />
        <MiniStat label="Resultado" value={getSessionWinner(item)} />
      </div>

      <h3 style={{ marginTop: 20 }}>Fundamentos</h3>
      {ranking.length === 0 ? <p style={styles.empty}>Sem jogadas.</p> : ranking.map(([name, d]) => (
        <div key={name} style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
            <strong>{name}</strong>
            <span>{d.total}x · {d.acertos} acertos · {d.erros} erros</span>
          </div>
          <TinyBar value={d.efficiency} />
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Placar por End</h3>
      {Object.keys(item.scores || {}).length === 0 ? <p style={styles.empty}>Sem placar por End salvo.</p> : Object.entries(item.scores || {}).map(([name, s]) => (
        <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
          <span>{name}</span><strong>{s.athlete} × {s.opponent}</strong>
        </div>
      ))}

      <h3 style={{ marginTop: 20 }}>Mapa de calor do atleta nesta partida</h3>
      <HistoricalHeatmap plays={athletePlays} />

      <h3 style={{ marginTop: 20 }}>Jogadas da partida</h3>
      {(item.plays || []).map((p, idx) => (
        <div key={p.id || idx} style={{ fontSize: 13, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
          <strong>{p.end} · {p.ball}</strong> · {p.color} · {p.play} · {p.result} · branca {p.whitePositionFrom}{p.whitePositionTo && p.whitePositionTo !== p.whitePositionFrom ? ` para ${p.whitePositionTo}` : ""}
        </div>
      ))}
    </div>
  );
}

function HistoricalHeatmap({ plays, sessions = [], playsForSession }) {
  const [mode, setMode] = useState("Desempenho");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [mapColor, setMapColor] = useState("Todas");

  const filteredPlays = useMemo(() => mapColor === "Todas" ? plays : plays.filter((p) => p.color === mapColor), [plays, mapColor]);
  const modePlays = useMemo(() => {
    if (mode === "Aproximação") return filteredPlays.filter((p) => p.play === "Aproximação");
    if (mode === "Batida") return filteredPlays.filter((p) => p.play === "Batida");
    return filteredPlays;
  }, [filteredPlays, mode]);
  const positionData = useMemo(() => buildPositionPerformance(modePlays), [modePlays]);

  const maxFreq = Math.max(1, ...Object.values(positionData).map((d) => d.total));
  const maxSaidas = Math.max(1, ...Object.values(positionData).map((d) => d.saidas));
  const heatColor = (d) => {
    if (!d) return "#f8fafc";
    let value = d.efficiency;
    if (mode === "Volume") value = (d.total / maxFreq) * 100;
    if (mode === "Saídas de jogo") value = (d.saidas / maxSaidas) * 100;
    if (value >= 80) return "#15803d"; if (value >= 60) return "#84cc16"; if (value >= 40) return "#facc15"; if (value >= 20) return "#fb923c"; return "#ef4444";
  };
  const detail = selectedPosition ? positionData[selectedPosition] : null;
  const evolution = useMemo(() => {
    return [...sessions].sort((a,b) => String(a.date || a.createdAt || "").localeCompare(String(b.date || b.createdAt || ""))).map((session) => {
      let pp = playsForSession ? playsForSession(session) : (session.plays || []);
      if (mapColor !== "Todas") pp = pp.filter((p) => p.color === mapColor);
      if (mode === "Saídas de jogo") pp = pp.filter((p) => p.play === "Saída de jogo");
      if (selectedPosition) pp = pp.filter((p) => (p.whitePositionTo || p.whitePositionFrom) === selectedPosition);
      const st = calcStats(pp);
      let value = st.efficiency;
      if (mode === "Acertos") value = st.accuracy;
      if (mode === "Erros") value = st.errorRate;
      if (mode === "Frequência") value = pp.length;
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
          <button key={item} onClick={() => setMode(item)} style={{ ...styles.button, padding: "9px 11px", background: mode === item ? "#0f172a" : "#64748b", fontSize: 12 }}>{item}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: 12, marginBottom: 10 }}>
        <strong>Escala:</strong>
        {[
          ["0–20%", "#ef4444"],
          ["21–40%", "#fb923c"],
          ["41–60%", "#facc15"],
          ["61–80%", "#84cc16"],
          ["81–100%", "#15803d"],
        ].map(([label, color]) => (
          <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, background: color, border: "1px solid rgba(15,23,42,.12)" }} />
            {label}
          </span>
        ))}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 20, height: 20, borderRadius: 4, background: "#0f172a", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>S</span>
          saída de jogo
        </span>
      </div>
      <div style={{ ...styles.map, gap: 4 }}>
        {POSITIONS.map((position, index) => position === null ? <div key={`hm-empty-${index}`} style={styles.positionEmpty} /> : (() => {
          const raw = positionData[position];
          const d = mode === "Saídas de jogo" && (position === "TB" || !raw || raw.saidas === 0) ? null : raw;
          const pct = !d ? 0 : mode === "Volume" ? (d.total/maxFreq)*100 : mode === "Saídas de jogo" ? (d.saidas/maxSaidas)*100 : d.efficiency;
          return <button key={position} onClick={() => d && setSelectedPosition(position)} style={{ minHeight: 58, border: selectedPosition === position ? "3px solid #0f172a" : "1px solid rgba(15,23,42,.12)", borderRadius: 8, background: d ? heatColor(d) : "#f8fafc", color: d && pct >= 80 ? "white" : "#0f172a", fontWeight: 800, cursor: d ? "pointer" : "default", position: "relative", gridColumn: position === "TB" ? "1 / -1" : undefined }}>
            <div>{position}{mode === "Saídas de jogo" && d?.saidas ? " S" : ""}</div><div style={{ fontSize: 11 }}>{d ? (mode === "Saídas de jogo" ? `${d.saidas}x` : `${pct.toFixed(0)}%`) : "—"}</div>
          </button>;
        })())}
      </div>
      {detail && (mode === "Saídas de jogo" ? (
        <div style={{ ...styles.info, marginTop: 12 }}>
          <strong>Posição {selectedPosition}</strong> · {detail.saidas} saída(s) realizada(s) pelo atleta
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e2e8f0" }}>
        <h3 style={{ margin: "0 0 4px" }}>📈 Evolução ${selectedPosition ? `· Posição ${selectedPosition}` : "· Todas as posições"}</h3>
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>O gráfico acompanha automaticamente os filtros do mapa de calor.</div>
        {evolution.length === 0 ? <p style={styles.empty}>Sem dados para os filtros selecionados.</p> : <div style={{ height: 190, display: "flex", alignItems: "flex-end", gap: 6, overflowX: "auto", padding: "8px 2px 22px", borderBottom: "1px solid #cbd5e1" }}>{evolution.map((point) => { const pct = mode === "Frequência" || mode === "Saídas de jogo" ? (point.value / maxEvolution) * 100 : point.value; return <div key={point.id} title={point.label + " · " + point.value.toFixed(1) + (mode === "Frequência" || mode === "Saídas de jogo" ? "x" : "%")} style={{ minWidth: 34, flex: "1 0 34px", maxWidth: 64, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center" }}><div style={{ fontSize: 10, fontWeight: 800, marginBottom: 4 }}>{mode === "Frequência" || mode === "Saídas de jogo" ? point.value.toFixed(0) + "x" : point.value.toFixed(0) + "%"}</div><div style={{ width: "70%", minHeight: 3, height: Math.max(3,pct) + "%", background: "#2563eb", borderRadius: "5px 5px 0 0" }} /><div style={{ fontSize: 9, color: "#64748b", marginTop: 4, whiteSpace: "nowrap" }}>{point.label.slice(0,5)}</div></div>;})}</div>}
      </div>
    </div>
      ) : (
        <div style={{ ...styles.info, marginTop: 12 }}>
          <strong>Posição {selectedPosition}</strong> · {detail.total} jogadas · {detail.acertos} acertos · {detail.funcionais} funcionais · {detail.erros} erros · <strong>{detail.efficiency.toFixed(1)}% eficiência</strong>
        </div>
      ))}
    </div>
  );
}

function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, isSuperAdmin = false, ownerAccounts = [], favoriteAthleteIds = [], onToggleFavorite }) {
  const [kind, setKind] = useState("Todos");
  const [athleteFilter, setAthleteFilter] = useState("Todos");
  const [gameFilter, setGameFilter] = useState("Todos");
  const [period, setPeriod] = useState("Tudo");
  const [colorFilter, setColorFilter] = useState("Todos");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [historyAthleteSearch, setHistoryAthleteSearch] = useState("");
  const [historyClassFilter, setHistoryClassFilter] = useState("Todos");
  const [historyGenderFilter, setHistoryGenderFilter] = useState("Todos");
  const [historyLevelFilter, setHistoryLevelFilter] = useState("Todos");
  const historyAthletes = useMemo(() => athletes.filter((a) => {
    const classOk = historyClassFilter === "Todos" || a.athleteClass === historyClassFilter;
    const genderOk = historyGenderFilter === "Todos" || a.gender === historyGenderFilter;
    const nameOk = !historyAthleteSearch.trim() || a.name.toLocaleLowerCase("pt-BR").startsWith(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"));
    return classOk && genderOk && nameOk;
  }).sort((a,b) => Number(favoriteAthleteIds.includes(b.id)) - Number(favoriteAthleteIds.includes(a.id)) || a.name.localeCompare(b.name,"pt-BR")), [athletes, historyClassFilter, historyGenderFilter, historyAthleteSearch, favoriteAthleteIds]);

  async function deleteScout(item) {
    if (!isSuperAdmin) return;
    if (!window.confirm(`Excluir definitivamente o Scout de ${item.athlete} × ${item.opponent}? Esta ação remove o Scout do banco de dados.`)) return;
    const { error } = await supabase.rpc('super_admin_delete_scout', { target_scout_id: item.id });
    if (error) {
      alert(error.message || 'Não foi possível excluir o Scout.');
      return;
    }
    if (selectedSessionId === item.id) setSelectedSessionId("");
    window.location.reload();
  }
  const [accountFilter, setAccountFilter] = useState("Todos");

  async function exportSavedSessionReport(item) {
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

    doc.save(`BochaScout_${item.athlete}_vs_${item.opponent}_${item.date || todayISO()}.pdf`);
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
    return null;
  }
  function colorForSelectedAthlete(session) {
    const role = athleteRole(session);
    if (role === "adversario") return session.athleteColor === "Vermelho" ? "Azul" : "Vermelho";
    return session.athleteColor;
  }
  function playsForSelectedAthlete(session) {
    const role = athleteRole(session);
    if (!role) return [];
    const targetColor = colorForSelectedAthlete(session);
    return (session.plays || []).filter((p) => p.color === targetColor);
  }
  function resultForSelectedAthlete(session) {
    const base = getSessionWinner(session);
    if (athleteRole(session) !== "adversario") return base;
    if (base === "Vitória") return "Derrota";
    if (base === "Derrota") return "Vitória";
    return base;
  }

  const filtered = sessions.filter((s) => {
    const dateOk = !cutoff || new Date(`${s.date}T12:00:00`) >= cutoff;
    const athleteOk = athleteFilter === "Todos" || s.athleteId === athleteFilter || s.opponentId === athleteFilter;
    const selectedColor = colorForSelectedAthlete(s);
    const role = athleteRole(s);
    const roleClass = role === "adversario" ? s.opponentClass : s.athleteClass;
    const athleteGenderValue = s.athleteGender || athletes.find((a)=>a.id===s.athleteId)?.gender || "";
    const opponentGenderValue = s.opponentGender || athletes.find((a)=>a.id===s.opponentId)?.gender || "";
    const roleGender = role === "adversario" ? opponentGenderValue : athleteGenderValue;
    const classOk = historyClassFilter === "Todos" || (athleteFilter === "Todos" ? s.athleteClass === historyClassFilter || s.opponentClass === historyClassFilter : roleClass === historyClassFilter);
    const genderOk = historyGenderFilter === "Todos" || (athleteFilter === "Todos" ? athleteGenderValue === historyGenderFilter || opponentGenderValue === historyGenderFilter : roleGender === historyGenderFilter);
    const levelOk = historyLevelFilter === "Todos" || (s.sessionKind === "Campeonato" && s.competitionLevel === historyLevelFilter);
    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && classOk && genderOk && levelOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;
  });
  const selected = sessions.find((s) => s.id === selectedSessionId);
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
    <div style={{ ...styles.card, borderTop: "6px solid #0f172a" }}>
      <h2 style={{ marginBottom: 4 }}>Histórico do atleta</h2><div style={{ color: "#65a30d", fontWeight: 700, marginBottom: 16 }}>Análise completa de desempenho</div>
      <div style={styles.grid}>
        {isAdmin && <Field label="Conta"><select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={styles.input}><option value="Todos">Todas as contas</option>{ownerAccounts.map(a=><option key={a.id} value={a.id}>{a.name || a.username || a.id}</option>)}</select></Field>}
        <Field label="🔎 Atleta"><AthleteCombobox
          items={historyAthletes}
          value={athleteFilter}
          onChange={setAthleteFilter}
          query={historyAthleteSearch}
          setQuery={setHistoryAthleteSearch}
          favoriteIds={favoriteAthleteIds}
          onToggleFavorite={onToggleFavorite}
          placeholder="🔎 Digite ou role os atletas"
          allowAll
        /></Field>
        <Field label="Classe"><select value={historyClassFilter} onChange={e=>{setHistoryClassFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{CLASSES.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Gênero"><select value={historyGenderFilter} onChange={e=>{setHistoryGenderFilter(e.target.value);setAthleteFilter("Todos");}} style={styles.input}><option>Todos</option>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></Field>
        <Field label="Nível"><select value={historyLevelFilter} onChange={e=>setHistoryLevelFilter(e.target.value)} style={styles.input}><option>Todos</option><option>Nacional</option><option>Internacional</option></select></Field>
        <Field label="Período"><select value={period} onChange={e=>setPeriod(e.target.value)} style={styles.input}><option>Tudo</option><option>30 dias</option><option>3 meses</option><option>6 meses</option><option>12 meses</option></select></Field>
        <Field label="Cor"><select value={colorFilter} onChange={e=>setColorFilter(e.target.value)} style={styles.input}><option>Todos</option><option>Vermelho</option><option>Azul</option></select></Field>
        <Field label="Tipo"><select value={kind} onChange={e=>setKind(e.target.value)} style={styles.input}><option>Todos</option><option>Treino</option><option>Campeonato</option></select></Field>
        <Field label="Tipo de jogo"><select value={gameFilter} onChange={e=>setGameFilter(e.target.value)} style={styles.input}><option>Todos</option>{GAME_TYPES.map(g=><option key={g}>{g}</option>)}</select></Field>
      </div>
    </div>

    <div style={styles.card}><div style={styles.miniStats}><MiniStat label="Partidas" value={filtered.length}/><MiniStat label="Vitórias" value={wins}/><MiniStat label="Derrotas" value={losses}/><MiniStat label="Aproveitamento" value={`${winRate.toFixed(1)}%`}/></div></div>

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
      <div style={styles.card}><h3>Perfil técnico</h3><div><strong>Melhor fundamento:</strong> {best ? `${best[0]} · ${best[1].efficiency.toFixed(1)}%` : "—"}</div><div style={{marginTop:8}}><strong>Fundamento de atenção:</strong> {worst ? `${worst[0]} · ${worst[1].errorRate.toFixed(1)}% de erro` : "—"}</div><div style={{marginTop:8}}><strong>Eficiência geral:</strong> {combined.efficiency.toFixed(1)}%</div></div>
    </div>

    {selected && <SessionDetail item={selected} selectedAthleteId={athleteFilter} onClose={()=>setSelectedSessionId("")} onExportPdf={exportSavedSessionReport}/>} 
    <div style={styles.card}><h2>Histórico de partidas</h2>{filtered.length===0?<p style={styles.empty}>Nenhuma sessão registrada com esse filtro.</p>:filtered.map(item=><div key={item.id} style={{padding:"12px 0",borderBottom:"1px solid #e2e8f0"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong>{item.athlete} × {item.opponent}</strong><div style={{fontSize:13,color:"#64748b"}}>{formatDateBR(item.date)} · {item.sessionKind} · {item.gameType} · {item.athleteColor}{isAdmin && <span> · Criado por: {item.ownerDisplay || ownerAccounts.find(a => a.id === item.ownerUserId)?.name || ownerAccounts.find(a => a.id === item.ownerUserId)?.username || "Conta"}</span>}</div></div><strong style={{fontSize:20}}>{item.totalAthlete} × {item.totalOpponent}</strong></div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}><button onClick={()=>setSelectedSessionId(item.id)} style={{...styles.button,background:"#2563eb",padding:"9px 12px"}}>Ver análise completa</button>{isSuperAdmin && <button onClick={()=>deleteScout(item)} style={{...styles.button,background:"#b91c1c",padding:"9px 12px"}}>Excluir Scout</button>}</div></div>)}</div>
    <button onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>
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
      <button onClick={onBack} style={{ ...styles.button, background: "#475569", width: "100%" }}>Voltar</button>
    </>
  );
}

export default function BochaScout() {
  // =========================================================
  // CADASTRO
  // =========================================================

  const [view, setView] = useState("dashboard");
  const [sessionKind, setSessionKind] = useState("Treino");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionPhase, setCompetitionPhase] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState("Nacional");
  const [competitionScope, setCompetitionScope] = useState("Nacional");
  const [sessionDate, setSessionDate] = useState(todayISO());

  const [athletes, setAthletes] = useState([]);
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
  const [currentUserId, setCurrentUserId] = useState("");
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
    setSessions(safeLoad(STORAGE_KEYS.sessions, []));

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
      const localOnly = localAthletes.filter((item) => !databaseIds.has(item.id));
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
    return () => { active = false; };
  }, []);

  useEffect(() => {
    safeSave(STORAGE_KEYS.athletes, athletes);
  }, [athletes]);

  useEffect(() => {
    safeSave(STORAGE_KEYS.sessions, sessions);
  }, [sessions]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setCurrentUserId(data?.user?.id || "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setCurrentUserId(session?.user?.id || "");
    });
    return () => { active = false; listener?.subscription?.unsubscribe?.(); };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    setSessions((prev) => prev.map((s) => s.ownerUserId ? s : { ...s, ownerUserId: currentUserId }));
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
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            createdAt: p.createdAt || row.created_at,
          };
        });
        const dbIds = new Set(dbSessions.map((s) => s.id));
        const localLegacy = safeLoad(STORAGE_KEYS.sessions, []).filter((s) => !dbIds.has(s.id)).map((s) => ({ ...s, ownerUserId: s.ownerUserId || currentUserId }));
        setSessions([...dbSessions, ...localLegacy]);
      }
    }
    loadSharedHistory();
    return () => { active = false; };
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    const mine = sessions.filter((s) => s.ownerUserId === currentUserId);
    if (!mine.length) return;
    const owner = ownerAccounts.find((p) => p.id === currentUserId);
    const ownerDisplay = owner?.name || owner?.username || "Conta";
    const timer = setTimeout(() => {
      mine.forEach(async (s) => {
        const row = {
          id: s.id,
          owner_id: currentUserId,
          session_date: s.date || todayISO(),
          session_kind: s.sessionKind || "Treino",
          game_type: s.gameType || "Individual",
          athlete_id: s.athleteId || null,
          opponent_id: s.opponentId || null,
          athlete_name: s.athlete || "",
          opponent_name: s.opponent || "",
          payload: { ...s, ownerUserId: currentUserId, ownerDisplay },
        };
        const result = await supabase.from("scout_sessions").upsert(row, { onConflict: "id" });
        if (result.error) console.error("Erro ao salvar scout no histórico da conta:", result.error);
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [sessions, currentUserId, ownerAccounts]);

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

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [tieBreak, setTieBreak] =
    useState(false);
  const [tieBreakRound, setTieBreakRound] = useState(1);

  const [showFinalDetails, setShowFinalDetails] = useState(false);
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

  const [selectedColor, setSelectedColor] = useState("");

  const [selectedResult, setSelectedResult] = useState("");

  // =========================================================
  // HISTÓRICO
  // =========================================================

  const [playsHistory, setPlaysHistory] = useState([]);
  const [commandHistory, setCommandHistory] = useState([]);
  const [discardedBalls, setDiscardedBalls] = useState({});
  const [undoStack, setUndoStack] = useState([]);

  function pushUndoSnapshot() {
    const snapshot = {
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

  // =========================================================
  // INICIAR PARTIDA
  // =========================================================

  function startGame() {
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

    setSessionDate(todayISO());
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

    setStage("white");
  }

  // =========================================================
  // INICIAR NOVO END
  // =========================================================

  function startNewEnd(index, forcedWhite) {
    setCurrentEnd(index);

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

  function selectInitialWhitePosition(position) {
    pushUndoSnapshot();
    setWhitePosition(position);

    setStage("color");
  }

  function selectNewWhitePosition(position) {
    setNewWhitePosition(position);
  }

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

    setSelectedColor(color);

    setSelectedResult("");

    setStage("result");
  }

  // =========================================================
  // SELECIONAR RESULTADO
  // =========================================================

  function selectResult(result) {
    setSelectedResult(result);

    setStage("play");
  }

  // =========================================================
  // SELECIONAR FUNDAMENTO
  // =========================================================

  function selectPlay(play) {
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

    if (play === "Mover branca") {
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

      play,

      result,

      time: now.toLocaleTimeString("pt-BR"),

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

      play: "Mover branca",

      result: "Acerto",

      time: now.toLocaleTimeString("pt-BR"),

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

    setWhitePosition(newWhitePosition);

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

    const resolvedAfter = totalBallsResolved + remaining;
    setSelectedColor("");
    setSelectedResult("");
    setStage(resolvedAfter >= 12 ? "endScore" : "color");
  }

  // =========================================================
  // LIMPAR JOGADA
  // =========================================================

  function clearCurrentPlay() {
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
    const a = Number(athleteScore);
    const o = Number(opponentScore);

    if (
      athleteScore === "" ||
      opponentScore === ""
    ) {
      alert("Digite o placar dos dois atletas.");
      return;
    }

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
    setPlaysHistory((previous) =>
      previous.filter(
        (play) => play.id !== id
      )
    );
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
  }


  useEffect(() => {
    if (!finished || playsHistory.length === 0) return;

    const statsSnapshot = calcStats(playsHistory.filter((p) => p.color === athleteColor));
    const totals = getRegularScoreTotals(scores);

    const id = `session-${sessionDate}-${athlete}-${opponent}-${playsHistory[0]?.id || Date.now()}`;

    setSessions((prev) => {
      if (prev.some((item) => item.id === id)) return prev;
      return [
        {
          id,
          ownerUserId: currentUserId || null,
          date: sessionDate,
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
        },
        ...prev,
      ];
    });
  }, [finished]);

  async function exportMatchReport() {
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
      `BochaScout_${athlete}_vs_${opponent}_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  }

  // =========================================================
  // TELA DE CADASTRO
  // =========================================================

  if (!started && !finished) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.brandHeader}>
            <div>
              <h1 style={styles.title}>BOCHA SCOUT</h1>
              <p style={styles.subtitle}>Análise técnica de Bocha Paralímpica</p>
            </div>
            <div style={styles.brandTag}>SCOUT & PERFORMANCE</div>
          </div>

          <TopNav view={view} setView={(next) => setView(next === "data" && !currentUserIsSuperAdmin ? "dashboard" : next)} isSuperAdmin={currentUserIsSuperAdmin} />

          {view === "dashboard" && (
            <DashboardScreen
              sessions={accountSessions}
              athletes={athletes}
              onNewTraining={() => { setSessionKind("Treino"); setCompetitionName(""); setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new"); }}
              onNewCompetition={() => { setSessionKind("Campeonato"); setCompetitionName(""); setCompetitionPhase(""); setCompetitionLevel("Nacional"); setView("new"); }}
              onHistory={() => setView("history")}
            />
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

          {view === "history" && (
            <HistoryScreen
              sessions={historySessions}
              athletes={athletes}
              isAdmin={currentUserIsAdmin}
              isSuperAdmin={currentUserIsSuperAdmin}
              ownerAccounts={ownerAccounts}
              favoriteAthleteIds={favoriteAthleteIds}
              onToggleFavorite={toggleFavoriteAthlete}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "data" && currentUserIsSuperAdmin && (
            <DataScreen
              athletes={athletes}
              sessions={sessions}
              onImport={importAllData}
              onClear={clearAllData}
              onBack={() => setView("dashboard")}
            />
          )}

          {view === "new" && (
            <div style={styles.card}>
              <h2>Novo Scout · {sessionKind}</h2>
              <p style={{ color: "#64748b", marginTop: -4 }}>
                Data automática: <strong>{formatDateBR(todayISO())}</strong>
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

                <Field label="Tipo de jogo">
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
                    <Field label="Classe"><select value={competitionClassFilter} onChange={(e) => { setCompetitionClassFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}><option value="Todos">Todas as classes</option>{CLASSES.map((c)=><option key={c} value={c}>{c}</option>)}</select></Field>
                    <Field label="Gênero"><select value={competitionGenderFilter} onChange={(e) => { setCompetitionGenderFilter(e.target.value); setSelectedAthleteId(""); setSelectedOpponentId(""); setAthlete(""); setOpponent(""); setAthleteClass(""); setOpponentClass(""); }} style={styles.input}><option value="Todos">Todos os gêneros</option>{GENDERS.map((g)=><option key={g} value={g}>{g}</option>)}</select></Field>
                  </>
                )}

                {gameType === "Individual" && sessionKind === "Treino" && (
                  <>
                    <div style={{ gridColumn: "1 / -1", fontWeight: 900, color: "#334155", marginTop: 4 }}><span style={{width:12,height:12,borderRadius:"50%",background:"#dc2626",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Vermelho</div>
                    <Field label="Classe do atleta">
                      <select value={athleteClassFilter} onChange={(e) => { setAthleteClassFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Gênero do atleta">
                      <select value={athleteGenderFilter} onChange={(e) => { setAthleteGenderFilter(e.target.value); setSelectedAthleteId(""); setAthlete(""); setAthleteClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {gameType === "Individual" ? (
                  <Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>
                    <AthleteCombobox
                      items={filteredPrimaryAthletes}
                      value={selectedAthleteId}
                      onChange={chooseRegisteredAthlete}
                      query={athleteNameSearch}
                      setQuery={setAthleteNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="🔎 Digite ou role os atletas"
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
                    <div style={{ gridColumn: "1 / -1", fontWeight: 900, color: "#334155", marginTop: 4 }}><span style={{width:12,height:12,borderRadius:"50%",background:"#2563eb",display:"inline-block",marginRight:7,verticalAlign:"-1px"}} />Atleta Azul</div>
                    <Field label="Classe do atleta azul">
                      <select value={opponentClassFilter} onChange={(e) => { setOpponentClassFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todas as classes</option>
                        {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </Field>
                    <Field label="Gênero do atleta azul">
                      <select value={opponentGenderFilter} onChange={(e) => { setOpponentGenderFilter(e.target.value); setSelectedOpponentId(""); setOpponent(""); setOpponentClass(""); }} style={styles.input}>
                        <option value="Todos">Todos os gêneros</option>
                        {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                  </>
                )}

                {gameType === "Individual" ? (
                  <Field label="🔵 Atleta Azul">
                    <AthleteCombobox
                      items={eligibleOpponents}
                      value={selectedOpponentId}
                      onChange={chooseRegisteredOpponent}
                      query={opponentNameSearch}
                      setQuery={setOpponentNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="🔎 Digite ou role os atletas"
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
                 Iniciar Scout
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
          <section className="scout-scoreboard" aria-label="Placar da partida">
            <div className="scout-brand">
              <img src="/bocha-scout-emblem.png" alt="" className="scout-brand-emblem" />
              <div><strong>BOCHA <span>SCOUT</span></strong><small>DADOS QUE INCLUEM</small></div>
            </div>
            <div className="scout-end-pill">{currentEndName}</div>
            <div className="scout-player scout-player-red">
              <strong title={redName}>{redName}</strong><span>VERMELHO</span>
              <div className="scout-ball-dots" aria-label={`${redBallsAvailable} bolas vermelhas restantes`}>
                {Array.from({ length: 6 }, (_, i) => <img key={i} src="/scout-assets/red-ball.png" alt="" className={i < redBallsAvailable ? "is-active" : "is-used"} />)}
              </div>
            </div>
            <div className="scout-score"><b>{redScore}</b><span>×</span><b>{blueScore}</b></div>
            <div className="scout-player scout-player-blue">
              <strong title={blueName}>{blueName}</strong><span>AZUL</span>
              <div className="scout-ball-dots" aria-label={`${blueBallsAvailable} bolas azuis restantes`}>
                {Array.from({ length: 6 }, (_, i) => <img key={i} src="/scout-assets/blue-ball.png" alt="" className={i < blueBallsAvailable ? "is-active" : "is-used"} />)}
              </div>
            </div>
          </section>

          {whitePosition && (
            <div className="scout-white-position">
              <img className="scout-white-ball" src="/scout-assets/white-ball.png" alt="Bola branca" />
              <strong>Branca: {whitePosition}</strong>
              <button type="button" className="scout-move-white" onClick={() => setStage("moveWhite")}>Mover</button>
            </div>
          )}

          {/* =================================================
              ETAPA 1 - POSIÇÃO INICIAL
          ================================================= */}

          {stage === "white" && (
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

              <div style={styles.selectedInfo}>
                {selectedColor}{" "}
                <strong>{selectedColor}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
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
                  
                  <strong>
                    Acerto
                  </strong>
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
                  
                  <strong>
                    Funcional
                  </strong>
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
                  
                  <strong>
                    Erro
                  </strong>
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

              <div
                className="scout-play-grid"
                style={
                  styles.playGrid
                }
              >
                {PLAYS.map((play, playIndex) => {
                  if (!showMoreFundamentals && playIndex >= 6) return null;
                  const unavailable =
                    play ===
                      "Saída de jogo" &&
                    usedPlaysThisEnd.has(
                      "Saída de jogo"
                    );

                  return (
                    <button
                      key={play}
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
                      {play ===
                        "Saída de jogo" &&
                      unavailable
                        ? ""
                        : ""}

                      <img className="scout-play-icon" src={playAsset(play)} alt="" />
                      <span className="scout-play-label">{play}</span>
                    </button>
                  );
                })}
              </div>
              {PLAYS.length > 6 && (
                <button type="button" className="scout-more-fundamentals" onClick={() => setShowMoreFundamentals((value) => !value)}>
                  {showMoreFundamentals ? "Menos fundamentos" : "Mais fundamentos"}
                  <span aria-hidden="true">⌄</span>
                </button>
              )}
            </div>
          )}

          {/* =================================================
              MOVER BRANCA
          ================================================= */}

          {stage ===
            "moveWhite" && (
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
            <EndScore
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
            />
          </div>

          {/* PATCH: remove-end-history-v6 */}

          {/* =================================================
              SCOUT AO VIVO - APENAS POR COR (PARCIAL ATUAL)
          ================================================= */}


          {/* =================================================
              SCOUT VERMELHO (PARCIAL)
          ================================================= */}

          <ColorScout
            color="Vermelho"
            stats={
              endStats.vermelho
            }
            ranking={
              endRedRanking
            }
            best={
              endRedBest
            }
            worst={
              endRedWorst
            }
          />

          {/* =================================================
              SCOUT AZUL (PARCIAL)
          ================================================= */}

          <ColorScout
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
          />

          <div className="scout-sticky-actions">
            <button
              onClick={undoLastAction}
              disabled={undoStack.length === 0}
              className="scout-undo-button"
            >
              <span aria-hidden="true">↶</span> Desfazer
            </button>
            <div className="scout-last-action">
              <small>Última ação</small>
              <strong>{lastRecordedPlay ? `${lastRecordedPlay.play} · ${lastRecordedPlay.result}` : "Nenhuma jogada"}</strong>
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

  const finalShowingAthlete = finalSelectedSide === "athlete";
  const finalName = finalShowingAthlete ? athlete : opponent;
  const finalColor = finalShowingAthlete ? athleteColor : opponentColor;
  const finalStats = finalShowingAthlete ? athleteMatchStats : opponentMatchStats;
  const finalPlays = finalShowingAthlete ? athleteMatchPlays : opponentMatchPlays;
  const finalBest = finalColor === "Vermelho" ? redBest : blueBest;
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
          <div className="scout-final-player">
            <img src={athleteColor === "Vermelho" ? "/scout-assets/red-ball.png" : "/scout-assets/blue-ball.png"} alt="" />
            <strong>{athlete}</strong><span>{athleteColor.toUpperCase()}</span>
          </div>
          <div className="scout-final-score">{totalAthlete}<span>×</span>{totalOpponent}</div>
          <div className="scout-final-player">
            <img src={opponentColor === "Vermelho" ? "/scout-assets/red-ball.png" : "/scout-assets/blue-ball.png"} alt="" />
            <strong>{opponent}</strong><span>{opponentColor.toUpperCase()}</span>
          </div>
        </div>
        <div className="scout-final-winner">{winnerName === "Empate" ? "Partida empatada" : `${winnerName} venceu${tieBreakWinner ? " no tie-break" : ""}`}</div>
        <div className="scout-final-ends">
          {Object.entries(scores).map(([name, score]) => (
            <div key={name}><span>{name.replace("End ", "E")}</span><strong>{score.athlete} – {score.opponent}</strong></div>
          ))}
        </div>
      </section>

      <main className="scout-final-content">
        <div className="scout-final-tabs">
          <button className={finalShowingAthlete ? "is-active" : ""} onClick={() => setFinalSelectedSide("athlete")}>{athlete}</button>
          <button className={!finalShowingAthlete ? "is-active" : ""} onClick={() => setFinalSelectedSide("opponent")}>{opponent}</button>
        </div>
        <h2>Desempenho de {finalName}</h2>
        <div className="scout-final-metrics">
          <div><span>Eficiência</span><strong>{finalStats.efficiency.toFixed(1)}%</strong><small>{finalStats.acertos} de {finalStats.total} bolas</small></div>
          <div><span>Acertos</span><strong>{finalStats.acertos}</strong><small>bolas no alvo</small></div>
          <div><span>Erros</span><strong>{finalStats.erros}</strong><small>{finalStats.erros === 1 ? "bola fora" : "bolas fora"}</small></div>
        </div>
        <button type="button" className="scout-final-row" onClick={() => setShowFinalDetails((value) => !value)}>
          <div className="scout-final-row-icon"><img src="/scout-assets/approach.png" alt="" /></div>
          <div><strong>Mapa de calor</strong><span>{finalColor} · {finalName}</span><small>Veja onde as bolas foram jogadas durante a partida.</small></div><b>›</b>
        </button>
        {showFinalDetails && <div className="scout-final-expanded"><HistoricalHeatmap plays={finalPlays} /></div>}
        <div className="scout-final-row">
          <div className="scout-final-row-icon"><img src="/scout-assets/defense.png" alt="" /></div>
          <div><strong>Fundamentos</strong><span>{finalBest ? `${finalBest[0]} · melhor desempenho` : "Sem jogadas registradas"}</span><small>Análise completa por fundamento.</small></div><b>›</b>
        </div>
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
            <HistoricalHeatmap plays={athleteMatchPlays} />
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
              <HistoricalHeatmap plays={opponentMatchPlays} />
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
    <div
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

function PositionMap({
  selected,
  onSelect,
}) {
  return (
    <div style={styles.map}>
      {POSITIONS.map(
        (position, index) =>
          position === null ? (
            <div
              key={`empty-${index}`}
              style={
                styles.positionEmpty
              }
            />
          ) : (
            <button
              key={position}
              onClick={() =>
                onSelect(
                  position
                )
              }
              style={{
                ...styles.position,

                ...(selected ===
                position
                  ? styles.positionSelected
                  : {}),
              }}
            >
              {position}
            </button>
          )
      )}
    </div>
  );
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

function EndScore({
  athlete,
  opponent,
  athleteColor,
  opponentColor,
  endName,
  onSave,
}) {
  const [
    athleteScore,
    setAthleteScore,
  ] = useState("");

  const [
    opponentScore,
    setOpponentScore,
  ] = useState("");

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
        <Field
          label={`${athleteColor} ${athlete}`}
        >
          <input
            type="number"
            min="0"
            value={
              athleteScore
            }
            onChange={(e) =>
              setAthleteScore(
                e.target.value
              )
            }
            style={
              styles.scoreInput
            }
          />
        </Field>

        <Field
          label={`${opponentColor} ${opponent}`}
        >
          <input
            type="number"
            min="0"
            value={
              opponentScore
            }
            onChange={(e) =>
              setOpponentScore(
                e.target.value
              )
            }
            style={
              styles.scoreInput
            }
          />
        </Field>
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
