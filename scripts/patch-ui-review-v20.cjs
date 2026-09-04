const fs = require('fs');
const path = require('path');

function patchFile(rel, fn) {
  const file = path.join(process.cwd(), rel);
  let src = fs.readFileSync(file, 'utf8');
  src = fn(src);
  fs.writeFileSync(file, src, 'utf8');
}

function replaceOnce(src, from, to) {
  return src.includes(from) ? src.replace(from, to) : src;
}

patchFile('src/components/BochaScout.tsx', (src) => {
  if (src.includes('// PATCH: ui-review-v20')) return src;

  if (src.includes('// PATCH: super-admin-delete-scout-v19')) {
    src = src.replace('// PATCH: super-admin-delete-scout-v19', '// PATCH: super-admin-delete-scout-v19\n// PATCH: ui-review-v20');
  } else {
    src = src.replace('import { supabase } from "../lib/supabase";', 'import { supabase } from "../lib/supabase";\n// PATCH: ui-review-v20');
  }

  // Corrige o filtro por conta no Histórico administrativo, que um patch antigo não conseguia inserir.
  const historyGrid = '<div style={styles.grid}>\n        <Field label="Atleta">';
  if (src.includes('const [accountFilter, setAccountFilter]') && !src.includes('<Field label="Conta"><select value={accountFilter}')) {
    src = replaceOnce(
      src,
      historyGrid,
      '<div style={styles.grid}>\n        {isAdmin && <Field label="Conta"><select value={accountFilter} onChange={e=>setAccountFilter(e.target.value)} style={styles.input}><option value="Todos">Todas as contas</option>{ownerAccounts.map(a=><option key={a.id} value={a.id}>{a.name || a.username || a.id}</option>)}</select></Field>}\n        <Field label="Atleta">'
    );
  }

  // Navegação principal: mais compacta, fixa durante a rolagem e confortável no celular.
  src = replaceOnce(
    src,
    '<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>',
    '<div style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", marginBottom: 15, position: "sticky", top: 8, zIndex: 30, background: "rgba(255,255,255,.94)", backdropFilter: "blur(10px)", padding: 8, border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}>'
  );

  // Refinamento visual geral sem mudar o fluxo do Scout.
  src = src.replace('background:\n      "#eef2f6",', 'background:\n      "linear-gradient(180deg,#f8fafc 0%,#eef2f6 100%)",');
  src = src.replace('maxWidth: 980,', 'maxWidth: 1180,');
  src = src.replace('borderRadius: 12,\n    padding: 18,\n    marginBottom: 15,\n    boxShadow:\n      "0 2px 10px rgba(15,23,42,0.06)",', 'borderRadius: 16,\n    padding: "clamp(14px,2.4vw,22px)",\n    marginBottom: 15,\n    boxShadow:\n      "0 8px 24px rgba(15,23,42,0.06)",');
  src = src.replace('borderRadius: 12,\n    padding: "18px 20px",', 'borderRadius: 16,\n    padding: "18px clamp(16px,3vw,26px)",');
  src = src.replace('"repeat(auto-fit,minmax(220px,1fr))"', '"repeat(auto-fit,minmax(190px,1fr))"');
  src = src.replace('"repeat(auto-fit,minmax(240px,1fr))"', '"repeat(auto-fit,minmax(210px,1fr))"');
  src = src.replace('padding: 12,\n    border:\n      "1px solid #cbd5e1",\n    borderRadius: 10,\n    fontSize: 16,', 'padding: "12px 13px",\n    border:\n      "1px solid #cbd5e1",\n    borderRadius: 12,\n    minHeight: 46,\n    fontSize: 16,');
  src = src.replace('borderRadius: 8,\n    padding:\n      "12px 16px",', 'borderRadius: 10,\n    padding:\n      "11px 15px",\n    minHeight: 44,');
  src = src.replace('gap: 35,\n    textAlign:', 'gap: 24,\n    flexWrap: "wrap",\n    textAlign:');
  src = src.replace('fontSize: 42,', 'fontSize: "clamp(34px,7vw,48px)",');
  src = src.replace('gridTemplateColumns:\n      "repeat(2,1fr)",', 'gridTemplateColumns:\n      "repeat(auto-fit,minmax(140px,1fr))",');
  src = src.replace('gridTemplateColumns:\n      "repeat(3,1fr)",', 'gridTemplateColumns:\n      "repeat(auto-fit,minmax(105px,1fr))",');
  src = src.replace('"repeat(auto-fit,minmax(180px,1fr))"', '"repeat(auto-fit,minmax(145px,1fr))"');

  return src;
});

patchFile('src/components/AdminPanel.tsx', (src) => {
  if (src.includes('// PATCH: admin-ui-review-v20')) return src;
  src = src.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\n// PATCH: admin-ui-review-v20");

  src = src.replace("const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 16 };", "const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 18, boxShadow: '0 8px 24px rgba(15,23,42,.06)' };");
  src = src.replace("const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 9, fontSize: 14, background: '#fff' };", "const input: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '11px 12px', minHeight: 44, border: '1px solid #cbd5e1', borderRadius: 11, fontSize: 14, background: '#fff' };");
  src = src.replace("const button: React.CSSProperties = { border: 0, borderRadius: 9, padding: '9px 11px', fontWeight: 800, cursor: 'pointer' };", "const button: React.CSSProperties = { border: 0, borderRadius: 10, padding: '9px 12px', minHeight: 40, fontWeight: 800, cursor: 'pointer' };");
  src = src.replace("background: '#f1f5f9'", "background: 'linear-gradient(180deg,#f8fafc 0%,#eef2f6 100%)'");
  src = src.replace("maxWidth: 1180", "maxWidth: 1240");
  src = src.replace("<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '14px 0' }}>", "<div style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', position: 'sticky', top: 8, zIndex: 20, background: 'rgba(248,250,252,.95)', backdropFilter: 'blur(10px)', padding: 8, borderRadius: 14, margin: '14px 0', boxShadow: '0 6px 18px rgba(15,23,42,.06)' }}>");
  src = src.replace("gridTemplateColumns: '2fr 1fr 1fr'", "gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))'");
  src = src.replace("gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto'", "gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))'");
  src = src.replace("gridTemplateColumns: '2fr 1fr 1fr', gap: 8", "gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 8");
  return src;
});

patchFile('src/components/AuthGate.tsx', (src) => {
  if (src.includes('// PATCH: auth-ui-review-v20')) return src;
  src = src.replace("import { supabase } from '../lib/supabase';", "import { supabase } from '../lib/supabase';\n// PATCH: auth-ui-review-v20");
  src = src.replace("maxWidth: 480, margin: '30px auto', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 10px 30px rgba(15,23,42,.08)'", "maxWidth: 480, margin: '30px auto', background: '#fff', borderRadius: 20, padding: 'clamp(20px,4vw,28px)', border: '1px solid #e2e8f0', boxShadow: '0 18px 50px rgba(15,23,42,.10)'");
  src = src.replace("<div style={{ background: '#0f172a', color: '#fff', padding: '8px 14px', fontFamily: 'Arial, sans-serif', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>", "<div style={{ background: '#0f172a', color: '#fff', padding: '9px 14px', fontFamily: 'Inter, Arial, sans-serif', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', position: 'sticky', top: 0, zIndex: 9997, boxShadow: '0 5px 18px rgba(15,23,42,.18)' }}>");
  return src;
});

console.log('ui-review-v20 aplicado');
