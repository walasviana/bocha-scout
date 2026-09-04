const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('// PATCH: account-scope-v9a')) process.exit(0);
function rep(a,b,label){if(src.includes(b))return;if(!src.includes(a))throw new Error('v9a '+label);src=src.replace(a,b);}
rep('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: account-scope-v9a','marker');
rep('  const [selectedOpponentId, setSelectedOpponentId] = useState("");','  const [selectedOpponentId, setSelectedOpponentId] = useState("");\n  const [currentUserId, setCurrentUserId] = useState("");','state');
rep('  useEffect(() => {\n    safeSave(STORAGE_KEYS.sessions, sessions);\n  }, [sessions]);',`  useEffect(() => {\n    safeSave(STORAGE_KEYS.sessions, sessions);\n  }, [sessions]);\n\n  useEffect(() => {\n    let active = true;\n    supabase.auth.getUser().then(({ data }) => {\n      if (active) setCurrentUserId(data?.user?.id || "");\n    });\n    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {\n      if (active) setCurrentUserId(session?.user?.id || "");\n    });\n    return () => { active = false; listener?.subscription?.unsubscribe?.(); };\n  }, []);\n\n  useEffect(() => {\n    if (!currentUserId) return;\n    setSessions((prev) => prev.map((s) => s.ownerUserId ? s : { ...s, ownerUserId: currentUserId }));\n  }, [currentUserId]);\n\n  const accountSessions = useMemo(() => currentUserId ? sessions.filter((s) => s.ownerUserId === currentUserId) : [], [sessions, currentUserId]);`,'effects');
rep('          id,\n          date: sessionDate,','          id,\n          ownerUserId: currentUserId || null,\n          date: sessionDate,','save owner');
src=src.replace('sessions={sessions}\n              athletes={athletes}\n              onNewScout=', 'sessions={accountSessions}\n              athletes={athletes}\n              onNewScout=');
src=src.replace('sessions={sessions}\n              athletes={athletes}\n              onBack={() => setView("dashboard")}', 'sessions={accountSessions}\n              athletes={athletes}\n              onBack={() => setView("dashboard")}');
src=src.replace('athletes={athletes}\n              sessions={sessions}\n              onAdd=', 'athletes={athletes}\n              sessions={accountSessions}\n              onAdd=');
if(!src.includes('ownerUserId: currentUserId || null'))throw new Error('v9a owner missing');
fs.writeFileSync(file,src,'utf8');
console.log('account-scope-v9a aplicado');
