const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('// PATCH: shared-history-v10')) process.exit(0);
function rep(a,b,l){if(src.includes(b))return;if(!src.includes(a))throw new Error('v10 '+l);src=src.replace(a,b);}

rep('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: shared-history-v10','marker');

rep('function HistoryScreen({ sessions, athletes, onBack }) {','function HistoryScreen({ sessions, athletes, onBack, isAdmin = false, ownerAccounts = [] }) {','history signature');
rep('  const [selectedSessionId, setSelectedSessionId] = useState("");','  const [selectedSessionId, setSelectedSessionId] = useState("");\n  const [accountFilter, setAccountFilter] = useState("Todos");','account state');

rep('    return (kind === "Todos" || s.sessionKind === kind) && athleteOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;',
'    const accountOk = !isAdmin || accountFilter === "Todos" || s.ownerUserId === accountFilter;\n    return accountOk && (kind === "Todos" || s.sessionKind === kind) && athleteOk && (gameFilter === "Todos" || s.gameType === gameFilter) && (colorFilter === "Todos" || selectedColor === colorFilter) && dateOk;',
'filter account');

rep('        <Field label="Atleta"><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>',
'        {isAdmin && <Field label="Conta"><select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={styles.input}><option value="Todos">Todas as contas</option>{ownerAccounts.map(a=><option key={a.id} value={a.id}>{a.name || a.username || a.id}</option>)}</select></Field>}\n        <Field label="Atleta"><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></Field>',
'account field');

rep('<div style={{fontSize:13,color:"#64748b"}}>{formatDateBR(item.date)} · {item.sessionKind} · {item.gameType} · {item.athleteColor}</div>',
'<div style={{fontSize:13,color:"#64748b"}}>{formatDateBR(item.date)} · {item.sessionKind} · {item.gameType} · {item.athleteColor}{isAdmin ? ` · Criado por: ${item.ownerDisplay || ownerAccounts.find(a=>a.id===item.ownerUserId)?.name || ownerAccounts.find(a=>a.id===item.ownerUserId)?.username || "Conta"}` : ""}</div>',
'history owner label');

rep('  const [currentUserId, setCurrentUserId] = useState("");','  const [currentUserId, setCurrentUserId] = useState("");\n  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);\n  const [ownerAccounts, setOwnerAccounts] = useState([]);','owner states');

rep('  const accountSessions = useMemo(() => currentUserId ? sessions.filter((s) => s.ownerUserId === currentUserId) : [], [sessions, currentUserId]);',
`  const accountSessions = useMemo(() => currentUserId ? sessions.filter((s) => s.ownerUserId === currentUserId) : [], [sessions, currentUserId]);
  const historySessions = currentUserIsAdmin ? sessions : accountSessions;

  useEffect(() => {
    if (!currentUserId) return;
    let active = true;
    async function loadSharedHistory() {
      const [{ data: profileRows, error: profileError }, { data: dbRows, error: sessionError }] = await Promise.all([
        supabase.from("profiles").select("id,name,username,role").order("name"),
        supabase.from("scout_sessions").select("id,owner_id,session_date,session_kind,game_type,athlete_id,opponent_id,athlete_name,opponent_name,payload,created_at,updated_at").order("created_at", { ascending: false })
      ]);
      if (!active) return;
      if (!profileError) {
        const profiles = profileRows || [];
        setOwnerAccounts(profiles);
        setCurrentUserIsAdmin(profiles.some((p) => p.id === currentUserId && p.role === "admin"));
      }
      if (!sessionError) {
        const names = Object.fromEntries((profileRows || []).map((p) => [p.id, p.name || p.username || "Conta"]));
        const dbSessions = (dbRows || []).map((row) => ({
          ...(row.payload || {}),
          id: row.id,
          ownerUserId: row.owner_id,
          ownerDisplay: names[row.owner_id] || row.payload?.ownerDisplay || "Conta",
          date: row.payload?.date || row.session_date,
          sessionKind: row.payload?.sessionKind || row.session_kind,
          gameType: row.payload?.gameType || row.game_type,
          athleteId: row.payload?.athleteId || row.athlete_id,
          opponentId: row.payload?.opponentId || row.opponent_id,
          athlete: row.payload?.athlete || row.athlete_name,
          opponent: row.payload?.opponent || row.opponent_name,
          createdAt: row.payload?.createdAt || row.created_at,
        }));
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
    const ownerDisplay = ownerAccounts.find((p) => p.id === currentUserId)?.name || ownerAccounts.find((p) => p.id === currentUserId)?.username || "Conta";
    const timer = setTimeout(async () => {
      for (const s of mine) {
        const payload = { ...s, ownerUserId: currentUserId, ownerDisplay };
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
          payload,
        };
        const { error } = await supabase.from("scout_sessions").upsert(row, { onConflict: "id" });
        if (error) console.error("Erro ao salvar scout no histórico da conta:", error);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [sessions, currentUserId, ownerAccounts]);`,
'shared loader saver');

src=src.replace('sessions={accountSessions}\n              athletes={athletes}\n              onBack={() => setView("dashboard")}', 'sessions={historySessions}\n              athletes={athletes}\n              isAdmin={currentUserIsAdmin}\n              ownerAccounts={ownerAccounts}\n              onBack={() => setView("dashboard")}');

if(!src.includes('Criado por: ${item.ownerDisplay')) throw new Error('v10 owner label missing');
if(!src.includes('supabase.from("scout_sessions").upsert')) throw new Error('v10 db save missing');
if(!src.includes('historySessions = currentUserIsAdmin ? sessions : accountSessions')) throw new Error('v10 admin history missing');
fs.writeFileSync(file,src,'utf8');
console.log('shared-history-v10 aplicado');
