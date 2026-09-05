const fs=require('fs');
const path=require('path');
const file=path.join(process.cwd(),'src/components/BochaScout.tsx');
let src=fs.readFileSync(file,'utf8');

if(src.includes('// PATCH: single-athlete-picker-v26')) process.exit(0);
function must(re,label){ if(!re.test(src)) throw new Error('v26 trecho não encontrado: '+label); }
function replaceOnce(re,to,label){ must(re,label); src=src.replace(re,to); }

if(src.includes('// PATCH: favorites-search-history-v25c')) {
  src=src.replace('// PATCH: favorites-search-history-v25c','// PATCH: favorites-search-history-v25c\n// PATCH: single-athlete-picker-v26');
} else {
  throw new Error('v26 marcador v25c não encontrado');
}

// Pesquisa passa a considerar somente nomes que COMEÇAM com o texto digitado.
src=src.replaceAll('item.name.toLocaleLowerCase("pt-BR").includes(athleteNameSearch.trim().toLocaleLowerCase("pt-BR"))','item.name.toLocaleLowerCase("pt-BR").startsWith(athleteNameSearch.trim().toLocaleLowerCase("pt-BR"))');
src=src.replaceAll('item.name.toLocaleLowerCase("pt-BR").includes(opponentNameSearch.trim().toLocaleLowerCase("pt-BR"))','item.name.toLocaleLowerCase("pt-BR").startsWith(opponentNameSearch.trim().toLocaleLowerCase("pt-BR"))');
src=src.replaceAll('a.name.toLocaleLowerCase("pt-BR").includes(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"))','a.name.toLocaleLowerCase("pt-BR").startsWith(historyAthleteSearch.trim().toLocaleLowerCase("pt-BR"))');

// Componente único: campo de digitação + lista rolável no mesmo lugar + estrela por nome.
const picker=`function AthleteCombobox({ items, value, onChange, query, setQuery, favoriteIds = [], onToggleFavorite, placeholder = "🔎 Digite ou role a lista", allowAll = false }) {
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
                  {item.athleteClass && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{item.athleteClass}{item.gender ? ` · ${item.gender}` : ""}</div>}
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

`;
replaceOnce(/function TopNav\(/,picker+'function TopNav(','componente AthleteCombobox');

// Atleta Vermelho: remove input + select + botão de favorito e usa um único campo com rolagem.
replaceOnce(/<input value=\{athleteNameSearch\}[\s\S]*?<button type="button" disabled=\{!selectedAthleteId\}[\s\S]*?<\/button>/,
`<AthleteCombobox
                      items={filteredPrimaryAthletes}
                      value={selectedAthleteId}
                      onChange={chooseRegisteredAthlete}
                      query={athleteNameSearch}
                      setQuery={setAthleteNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="🔎 Digite ou role os atletas"
                    />`,'seletor vermelho');

// Atleta Azul.
replaceOnce(/<input value=\{opponentNameSearch\}[\s\S]*?<button type="button" disabled=\{!selectedOpponentId\}[\s\S]*?<\/button>/,
`<AthleteCombobox
                      items={eligibleOpponents}
                      value={selectedOpponentId}
                      onChange={chooseRegisteredOpponent}
                      query={opponentNameSearch}
                      setQuery={setOpponentNameSearch}
                      favoriteIds={favoriteAthleteIds}
                      onToggleFavorite={toggleFavoriteAthlete}
                      placeholder="🔎 Digite ou role os atletas"
                    />`,'seletor azul');

// Histórico: o mesmo campo único, com opção Todos quando nada foi digitado.
replaceOnce(/<input value=\{historyAthleteSearch\}[\s\S]*?<button type="button" disabled=\{athleteFilter==="Todos"\}[\s\S]*?<\/button>/,
`<AthleteCombobox
          items={historyAthletes}
          value={athleteFilter}
          onChange={setAthleteFilter}
          query={historyAthleteSearch}
          setQuery={setHistoryAthleteSearch}
          favoriteIds={favoriteAthleteIds}
          onToggleFavorite={onToggleFavorite}
          placeholder="🔎 Digite ou role os atletas"
          allowAll
        />`,'seletor histórico');

fs.writeFileSync(file,src,'utf8');
console.log('single-athlete-picker-v26 aplicado');
