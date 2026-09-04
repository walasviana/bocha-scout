const fs = require('fs');
const path = require('path');

function patchFile(rel, fn) {
  const file = path.join(process.cwd(), rel);
  let src = fs.readFileSync(file, 'utf8');
  src = fn(src);
  fs.writeFileSync(file, src, 'utf8');
}

function replaceRequired(src, from, to, label) {
  if (!src.includes(from)) throw new Error(`v22 trecho não encontrado: ${label}`);
  return src.replace(from, to);
}

patchFile('src/components/AdminPanel.tsx', (src) => {
  if (src.includes('// PATCH: notification-bell-admin-v22')) return src;
  src = src.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\n// PATCH: notification-bell-admin-v22");

  src = replaceRequired(
    src,
    "export default function AdminPanel({ onClose }: { onClose: () => void }) {",
    "export default function AdminPanel({ onClose, initialTab = 'overview' }: { onClose: () => void; initialTab?: 'overview' | 'notifications' }) {",
    'assinatura AdminPanel'
  );

  src = replaceRequired(
    src,
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'notifications' | 'audit'>('overview');",
    "const [tab, setTab] = useState<'overview' | 'accounts' | 'athletes' | 'teams' | 'notifications' | 'audit'>(initialTab);",
    'estado da aba'
  );

  src = replaceRequired(
    src,
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['notifications',`Notificações (${pendingNotifications.length})`],['audit','Auditoria']].map(([id,label]) => (",
    "{[['overview','Visão geral'],['accounts','Contas'],['athletes','Atletas'],['teams','Pares/Equipes'],['audit','Auditoria']].map(([id,label]) => (",
    'remoção da aba Notificações'
  );

  return src;
});

patchFile('src/components/AuthGate.tsx', (src) => {
  if (src.includes('// PATCH: notification-bell-auth-v22')) return src;
  src = src.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\n// PATCH: notification-bell-auth-v22");

  src = replaceRequired(
    src,
    "  const [showAdmin, setShowAdmin] = useState(false);",
    "  const [showAdmin, setShowAdmin] = useState(false);\n  const [adminInitialTab, setAdminInitialTab] = useState<'overview' | 'notifications'>('overview');\n  const [notificationCount, setNotificationCount] = useState(0);",
    'estados do sino'
  );

  const profileEnd = "  }\n\n  useEffect(() => {\n    supabase.auth.getSession()";
  const countLoader = `  }\n\n  async function loadNotificationCount() {\n    if (profile?.role !== 'admin') {\n      setNotificationCount(0);\n      return;\n    }\n    const { data, error } = await supabase\n      .from('admin_notifications')\n      .select('id')\n      .eq('status', 'pending');\n    if (!error) setNotificationCount((data || []).length);\n  }\n\n  useEffect(() => {\n    supabase.auth.getSession()`;
  src = replaceRequired(src, profileEnd, countLoader, 'carregador do contador');

  const authEffectEnd = "    return () => data.subscription.unsubscribe();\n  }, []);\n\n  async function submit";
  const authEffectWithBell = "    return () => data.subscription.unsubscribe();\n  }, []);\n\n  useEffect(() => {\n    void loadNotificationCount();\n  }, [profile?.role, showAdmin]);\n\n  async function submit";
  src = replaceRequired(src, authEffectEnd, authEffectWithBell, 'efeito do contador');

  const adminButton = "          {isAdmin && <button onClick={() => setShowAdmin(true)} style={{ border: '1px solid #93c5fd', background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Painel Admin</button>}";
  const bellAndAdmin = `          {isAdmin && <button\n            onClick={() => { setAdminInitialTab('notifications'); setShowAdmin(true); }}\n            title="Notificações"\n            aria-label={notificationCount > 0 ? \`Notificações: \${notificationCount} pendente(s)\` : 'Notificações'}\n            style={{ position: 'relative', border: '1px solid #64748b', background: '#1e293b', color: '#fff', borderRadius: 8, padding: '7px 11px', minWidth: 42, fontSize: 18, lineHeight: 1, cursor: 'pointer' }}\n          >\n            🔔\n            {notificationCount > 0 && <span style={{ position: 'absolute', top: -7, right: -7, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 999, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 900, display: 'grid', placeItems: 'center', boxSizing: 'border-box' }}>{notificationCount > 99 ? '99+' : notificationCount}</span>}\n          </button>}\n          {isAdmin && <button onClick={() => { setAdminInitialTab('overview'); setShowAdmin(true); }} style={{ border: '1px solid #93c5fd', background: '#1d4ed8', color: '#fff', borderRadius: 8, padding: '7px 10px', fontWeight: 700 }}>Painel Admin</button>}`;
  src = replaceRequired(src, adminButton, bellAndAdmin, 'botão Painel Admin');

  src = replaceRequired(
    src,
    "      {showAdmin && isAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}",
    "      {showAdmin && isAdmin && <AdminPanel initialTab={adminInitialTab} onClose={() => setShowAdmin(false)} />}",
    'abertura do AdminPanel'
  );

  return src;
});

console.log('notification-bell-v22 aplicado');
