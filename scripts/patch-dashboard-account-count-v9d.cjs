const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');
if(src.includes('// PATCH: dashboard-account-count-v9d')) process.exit(0);
function rep(a,b,l){if(src.includes(b))return;if(!src.includes(a))throw new Error('v9d '+l);src=src.replace(a,b);}
rep('import { supabase } from "../lib/supabase";','import { supabase } from "../lib/supabase";\n// PATCH: dashboard-account-count-v9d','marker');
rep('  sessions = visibleSessions;\n  const totalPlays =','  sessions = visibleSessions;\n  const accountAthleteCount = new Set(sessions.flatMap((s) => [s.athleteId, s.opponentId].filter(Boolean))).size;\n  const totalPlays =','count');
rep('<MiniStat label="Atletas" value={athletes.length} />','<MiniStat label="Atletas" value={accountAthleteCount} />','metric');
fs.writeFileSync(file,src,'utf8');
console.log('dashboard-account-count-v9d aplicado');
