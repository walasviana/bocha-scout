const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'src/components/BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: history-redblue-v4')) {
  console.log('history-redblue-v4 já aplicado');
  process.exit(0);
}

const historyStart = src.indexOf('function HistoryScreen');
const dataStart = src.indexOf('function DataScreen', historyStart);
if (historyStart < 0 || dataStart < 0) throw new Error('HistoryScreen não encontrado');

let beforeHistory = src.slice(0, historyStart);
let history = src.slice(historyStart, dataStart);
let afterHistory = src.slice(dataStart);

// O patch v3 atingia por engano o campo "Atleta" do Histórico.
// Restaura o filtro do Histórico para usar TODOS os atletas carregados do banco.
history = history.replace(
  /<Field label="🔴 Atleta Vermelho">[\s\S]*?<\/Field>/,
  '<Field label="Atleta"><select value={athleteFilter} onChange={e=>setAthleteFilter(e.target.value)} style={styles.input}><option value="Todos">Todos os atletas</option>{athletes.map(a=><option key={a.id} value={a.id}>{a.name}{a.athleteClass ? ` · ${a.athleteClass}` : ""}{a.country ? ` · ${a.country}` : ""}</option>)}</select></Field>'
);

src = beforeHistory + history + afterHistory;

// Agora altera SOMENTE o campo de atleta dentro da tela Novo Scout.
const newViewStart = src.indexOf('{view === "new" && (');
if (newViewStart < 0) throw new Error('Tela Novo Scout não encontrada');

const newViewHead = src.slice(0, newViewStart);
let newViewTail = src.slice(newViewStart);

newViewTail = newViewTail.replace(
  /<Field label="Atleta">[\s\S]*?<\/Field>/,
  [
    '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#dc2626", display: "inline-block", flex: "0 0 12px" }} />Atleta Vermelho</span>}>',
    '                    <select value={selectedAthleteId} onChange={(e) => chooseRegisteredAthlete(e.target.value)} style={styles.input}>',
    '                      <option value="">Selecione o atleta vermelho</option>',
    '                      {availableAthletes.map((item) => (',
    '                        <option key={item.id} value={item.id}>{item.name} · {item.athleteClass}{item.country ? " · " + item.country : ""}{item.uf ? "/" + item.uf : ""}</option>',
    '                      ))}',
    '                    </select>',
    '                  </Field>'
  ].join('\n')
);

newViewTail = newViewTail.replace(
  '<Field label="🔵 Atleta Azul">',
  '<Field label={<span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><span style={{ width: 12, height: 12, borderRadius: "50%", background: "#2563eb", display: "inline-block", flex: "0 0 12px" }} />Atleta Azul</span>}>'
);

src = newViewHead + newViewTail;

// Marcação e verificações para impedir nova regressão.
src = src.replace(
  'import { supabase } from "../lib/supabase";',
  'import { supabase } from "../lib/supabase";\n// PATCH: history-redblue-v4'
);

const checkHistoryStart = src.indexOf('function HistoryScreen');
const checkDataStart = src.indexOf('function DataScreen', checkHistoryStart);
const checkHistory = src.slice(checkHistoryStart, checkDataStart);
if (checkHistory.includes('availableAthletes') || checkHistory.includes('chooseRegisteredAthlete') || checkHistory.includes('value={selectedAthleteId}')) {
  throw new Error('Histórico ainda contém referências da tela Novo Scout');
}
if (!checkHistory.includes('Todos os atletas') || !checkHistory.includes('athletes.map')) {
  throw new Error('Filtro de todos os atletas não foi restaurado no Histórico');
}
if (!src.includes('Atleta Vermelho</span>}') || !src.includes('Atleta Azul</span>}')) {
  throw new Error('Indicadores vermelho/azul não foram aplicados');
}

fs.writeFileSync(file, src, 'utf8');
console.log('history-redblue-v4 aplicado: Histórico restaurado + seleção vermelho/azul corrigida');
