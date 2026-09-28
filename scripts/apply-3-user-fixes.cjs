const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'src', 'components', 'BochaScout.tsx');
let src = fs.readFileSync(file, 'utf8');

if (src.includes('// PATCH: user-fixes-3-details-v27')) {
  console.log('user-fixes-3-details-v27 já aplicado');
  process.exit(0);
}
src = '// PATCH: user-fixes-3-details-v27\n' + src;

console.log('Original BochaScout length:', src.length);

// 1. SessionDetail End score table - display penalty if present
const oldSessionScore = `        <div key={name} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>\r\n          <span>{name}</span><strong>{s.athlete} × {s.opponent}</strong>`;
const oldSessionScoreLF = `        <div key={name} style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>\n          <span>{name}</span><strong>{s.athlete} × {s.opponent}</strong>`;

const newSessionScore = `        <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, padding: "7px 0", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <span>{name}</span>
            {s.penalty && (
              <span style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 7px",
                borderRadius: 6,
                background: s.penalty === "Acerto" ? "#dcfce7" : "#fee2e2",
                color: s.penalty === "Acerto" ? "#166534" : "#991b1b"
              }}>
                ⚖️ Penalidade: {s.penalty}
              </span>
            )}
          </div>
          <strong>{s.athlete} × {s.opponent}</strong>`;

if (src.includes(oldSessionScore)) {
  src = src.replace(oldSessionScore, newSessionScore);
  console.log('P1: SessionDetail penalty display applied (CRLF)');
} else if (src.includes(oldSessionScoreLF)) {
  src = src.replace(oldSessionScoreLF, newSessionScore);
  console.log('P1: SessionDetail penalty display applied (LF)');
} else {
  console.log('P1: Warning - oldSessionScore not matched');
}

// 2. HistoryScreen - ESC key handler + Overlay Modal for "Ver analise completa"
const oldHistoryScreenState = `  const [selectedSessionId, setSelectedSessionId] = useState("");\r\n  const [expandedSessionId, setExpandedSessionId] = useState("");`;
const oldHistoryScreenStateLF = `  const [selectedSessionId, setSelectedSessionId] = useState("");\n  const [expandedSessionId, setExpandedSessionId] = useState("");`;

const newHistoryScreenState = `  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [expandedSessionId, setExpandedSessionId] = useState("");

  useEffect(() => {
    if (!selectedSessionId) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setSelectedSessionId("");
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [selectedSessionId]);`;

if (src.includes(oldHistoryScreenState)) {
  src = src.replace(oldHistoryScreenState, newHistoryScreenState);
  console.log('P2: HistoryScreen ESC effect applied (CRLF)');
} else if (src.includes(oldHistoryScreenStateLF)) {
  src = src.replace(oldHistoryScreenStateLF, newHistoryScreenState);
  console.log('P2: HistoryScreen ESC effect applied (LF)');
} else {
  console.log('P2: Warning - oldHistoryScreenState not matched');
}

// HistoryScreen bottom - render modal overlay when selectedSessionId is present
const oldHistoryBottom = `    <button onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>\r\n  </>;\r\n}`;
const oldHistoryBottomLF = `    <button onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>\n  </>;\n}`;

const newHistoryBottom = `    {(() => {
      const fullSelectedSession = sessions.find((s) => s.id === selectedSessionId);
      if (!fullSelectedSession) return null;
      return (
        <div
          className="history-full-match-modal"
          role="dialog"
          aria-modal="true"
          aria-label={\`Análise completa da partida: \${fullSelectedSession.athlete} × \${fullSelectedSession.opponent}\`}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(6px)",
            overflowY: "auto",
            padding: "16px 12px",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 900,
              background: "#ffffff",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              margin: "12px auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#0f172a",
                color: "#ffffff",
                padding: "14px 20px",
                borderBottom: "1px solid #334155",
                position: "sticky",
                top: 0,
                zIndex: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📊</span>
                  <span>Análise Completa da Partida</span>
                </div>
                <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                  {fullSelectedSession.athlete} × {fullSelectedSession.opponent} · {formatDateBR(fullSelectedSession.date)} · {fullSelectedSession.gameType}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionId("")}
                style={{
                  background: "#ffffff",
                  color: "#0f172a",
                  border: 0,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              >
                ✕ Fechar tela
              </button>
            </div>

            <div style={{ padding: "16px 20px" }}>
              <SessionDetail
                item={fullSelectedSession}
                onClose={() => setSelectedSessionId("")}
                onExportPdf={exportPdf}
                selectedAthleteId={athleteFilter}
              />
            </div>
          </div>
        </div>
      );
    })()}

    <button onClick={onBack} style={{...styles.button,background:"#475569",width:"100%"}}>Voltar</button>
  </>;
}`;

if (src.includes(oldHistoryBottom)) {
  src = src.replace(oldHistoryBottom, newHistoryBottom);
  console.log('P3: HistoryScreen overlay modal applied (CRLF)');
} else if (src.includes(oldHistoryBottomLF)) {
  src = src.replace(oldHistoryBottomLF, newHistoryBottom);
  console.log('P3: HistoryScreen overlay modal applied (LF)');
} else {
  console.log('P3: Warning - oldHistoryBottom not matched');
}

// 3. MatchAccordionItem - props + badge + penalty in chip + restore button
const oldAccordionSig = `function MatchAccordionItem({ item, isExpanded, onToggle, onSelectFull, onDelete = null, isAdmin = false }) {`;
const newAccordionSig = `function MatchAccordionItem({ item, isExpanded, onToggle, onSelectFull, onDelete = null, onRestore = null, isAdmin = false, isSuperAdmin = false }) {`;

if (src.includes(oldAccordionSig)) {
  src = src.replace(oldAccordionSig, newAccordionSig);
  console.log('P4: MatchAccordionItem signature updated');
}

// MatchAccordionItem date + chevron: add badge if deletionRequested
const oldAccordionDate = `<span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{formatDateBR(item.date)}</span>`;
const newAccordionDate = `{isSuperAdmin && (item.deletionRequested || item.approvalStatus === "pending_deletion") && (
            <span style={{
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
              borderRadius: 6,
              padding: "2px 6px",
              fontSize: 10,
              fontWeight: 800,
            }}>
              Exclusão solicitada
            </span>
          )}
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{formatDateBR(item.date)}</span>`;

if (src.includes(oldAccordionDate)) {
  src = src.replace(oldAccordionDate, newAccordionDate);
  console.log('P5: MatchAccordionItem date badge updated');
}

// MatchAccordionItem chip - add penalty indicator
const oldAccordionChip = `                  <div className="scout-end-chip-score">\r\n                    <span className={aLead ? "score-lead" : ""}>{aPts}</span>\r\n                    <span style={{ color: "#cbd5e1", fontSize: 10 }}>-</span>\r\n                    <span className={oLead ? "score-trail" : ""}>{oPts}</span>\r\n                  </div>`;
const oldAccordionChipLF = `                  <div className="scout-end-chip-score">\n                    <span className={aLead ? "score-lead" : ""}>{aPts}</span>\n                    <span style={{ color: "#cbd5e1", fontSize: 10 }}>-</span>\n                    <span className={oLead ? "score-trail" : ""}>{oPts}</span>\n                  </div>`;

const newAccordionChip = `                  <div className="scout-end-chip-score">
                    <span className={aLead ? "score-lead" : ""}>{aPts}</span>
                    <span style={{ color: "#cbd5e1", fontSize: 10 }}>-</span>
                    <span className={oLead ? "score-trail" : ""}>{oPts}</span>
                  </div>
                  {sc.penalty && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 800,
                      marginTop: 2,
                      padding: "1px 4px",
                      borderRadius: 4,
                      background: sc.penalty === "Acerto" ? "#dcfce7" : "#fee2e2",
                      color: sc.penalty === "Acerto" ? "#166534" : "#991b1b",
                      whiteSpace: "nowrap"
                    }}>
                      {sc.penalty === "Acerto" ? "⚖️ Penal: ✓" : "⚖️ Penal: ✗"}
                    </span>
                  )}`;

if (src.includes(oldAccordionChip)) {
  src = src.replace(oldAccordionChip, newAccordionChip);
  console.log('P6: MatchAccordionItem chip penalty indicator applied (CRLF)');
} else if (src.includes(oldAccordionChipLF)) {
  src = src.replace(oldAccordionChipLF, newAccordionChip);
  console.log('P6: MatchAccordionItem chip penalty indicator applied (LF)');
}

// MatchAccordionItem buttons: action labels + restore button
const oldAccordionBtns = `            {onDelete && (\r\n              <button\r\n                type="button"\r\n                onClick={onDelete}\r\n                style={{ ...styles.button, background: "#b91c1c", padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}\r\n              >\r\n                Excluir Scout\r\n              </button>\r\n            )}`;
const oldAccordionBtnsLF = `            {onDelete && (\n              <button\n                type="button"\n                onClick={onDelete}\n                style={{ ...styles.button, background: "#b91c1c", padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}\n              >\n                Excluir Scout\n              </button>\n            )}`;

const newAccordionBtns = `            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                style={{ ...styles.button, background: "#b91c1c", padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}
              >
                {isSuperAdmin && (item.deletionRequested || item.approvalStatus === "pending_deletion")
                  ? "Aprovar exclusão permanente"
                  : "Excluir Scout"}
              </button>
            )}
            {isSuperAdmin && (item.deletionRequested || item.approvalStatus === "pending_deletion") && onRestore && (
              <button
                type="button"
                onClick={onRestore}
                style={{ ...styles.button, background: "#15803d", padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#ffffff" }}
              >
                Restaurar / Voltar Scout
              </button>
            )}`;

if (src.includes(oldAccordionBtns)) {
  src = src.replace(oldAccordionBtns, newAccordionBtns);
  console.log('P7: MatchAccordionItem buttons updated (CRLF)');
} else if (src.includes(oldAccordionBtnsLF)) {
  src = src.replace(oldAccordionBtnsLF, newAccordionBtns);
  console.log('P7: MatchAccordionItem buttons updated (LF)');
}

// 4. MyMatchesScreen - full update with handleDeleteScout & handleRestoreScout
const oldMyMatchesStart = `function MyMatchesScreen({ sessions, onBack, onDeleted, isAdmin = false, isSuperAdmin = false, ownerAccounts = [] }) {`;
const newMyMatchesStart = `function MyMatchesScreen({ sessions, onBack, onDeleted, onRestore, isAdmin = false, isSuperAdmin = false, ownerAccounts = [], currentUserId = "" }) {`;

if (src.includes(oldMyMatchesStart)) {
  src = src.replace(oldMyMatchesStart, newMyMatchesStart);
  console.log('P8: MyMatchesScreen signature updated');
}

// Replace deleteScout in MyMatchesScreen
const oldDeleteScout = `  async function deleteScout(item) {
    if (!isSuperAdmin) return;
    if (!window.confirm(\`Excluir definitivamente o Scout de \${item.athlete} × \${item.opponent}? Esta ação remove o Scout do banco de dados.\`)) return;
    const { error } = await supabase.rpc("super_admin_delete_scout", { target_scout_id: item.id });
    if (error) {
      alert(error.message || "Não foi possível excluir o Scout.");
      return;
    }
    if (selectedSessionId === item.id) setSelectedSessionId("");
    forgetSession(item.id);
    onDeleted?.(item.id);
  }`;

const newDeleteScout = `  async function handleDeleteScout(item) {
    if (isSuperAdmin) {
      if (!window.confirm(\`Excluir definitivamente o Scout de \${item.athlete} × \${item.opponent}? Esta ação remove o Scout do banco de dados.\`)) return;
      const { error } = await supabase.rpc("super_admin_delete_scout", { target_scout_id: item.id });
      if (error) {
        const direct = await supabase.from("scout_sessions").delete().eq("id", item.id);
        if (direct.error) {
          alert(direct.error.message || error.message || "Não foi possível excluir o Scout.");
          return;
        }
      }
      if (selectedSessionId === item.id) setSelectedSessionId("");
      forgetSession(item.id);
      onDeleted?.(item.id);
      return;
    }

    if (!window.confirm(\`Excluir o Scout de \${item.athlete} × \${item.opponent} da sua conta? Ele não aparecerá mais para você e a exclusão definitiva aguardará aprovação do administrador.\`)) return;

    const updatedPayload = {
      ...(item.payload || item),
      deletionRequested: true,
      deletionRequestedAt: new Date().toISOString(),
      deletionRequestedBy: currentUserId,
    };

    const { error: updateError } = await supabase.from("scout_sessions").update({
      approval_status: "pending_deletion",
      payload: updatedPayload,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);

    if (updateError) {
      console.warn("Aviso ao atualizar status no banco:", updateError.message);
    }

    try {
      await supabase.from("admin_notifications").insert({
        source_type: "scout",
        source_id: item.id,
        requester_id: currentUserId || null,
        title: \`Exclusão de Scout: \${item.athlete} × \${item.opponent}\`,
        message: \`O usuário solicitou a exclusão do Scout de \${formatDateBR(item.date)}.\`,
        status: "pending",
        change_data: {
          action: "delete_scout",
          scout_id: item.id,
          athlete: item.athlete,
          opponent: item.opponent,
          date: item.date,
        },
      });
    } catch (e) {
      console.warn("Aviso ao registrar notificação:", e);
    }

    if (selectedSessionId === item.id) setSelectedSessionId("");
    forgetSession(item.id);
    onDeleted?.(item.id);
    alert("Scout excluído da sua conta com sucesso! A solicitação de exclusão definitiva foi enviada ao administrador.");
  }

  async function handleRestoreScout(item) {
    if (!isSuperAdmin) return;
    if (!window.confirm(\`Restaurar o Scout de \${item.athlete} × \${item.opponent} para a conta do usuário?\`)) return;

    const nextPayload = { ...(item.payload || item), deletionRequested: false };
    delete nextPayload.deletionRequestedAt;
    delete nextPayload.deletionRequestedBy;

    const { error } = await supabase.from("scout_sessions").update({
      approval_status: "approved",
      payload: nextPayload,
      updated_at: new Date().toISOString(),
    }).eq("id", item.id);

    if (error) {
      alert(error.message || "Não foi possível restaurar o Scout.");
      return;
    }

    try {
      await supabase.from("admin_notifications").update({
        status: "rejected",
        resolved_at: new Date().toISOString(),
      }).eq("source_id", item.id).eq("status", "pending");
    } catch {}

    onRestore?.(item.id);
    alert("Scout restaurado com sucesso! Ele voltou a aparecer na conta do usuário.");
  }`;

// Handle both CRLF and LF in oldDeleteScout
const oldDeleteScoutCRLF = oldDeleteScout.replace(/\n/g, '\r\n');
if (src.includes(oldDeleteScoutCRLF)) {
  src = src.replace(oldDeleteScoutCRLF, newDeleteScout);
  console.log('P9: handleDeleteScout replaced (CRLF)');
} else if (src.includes(oldDeleteScout)) {
  src = src.replace(oldDeleteScout, newDeleteScout);
  console.log('P9: handleDeleteScout replaced (LF)');
} else {
  console.log('P9: Warning - oldDeleteScout not matched');
}

// MyMatchesScreen match list - pass onDelete and onRestore
const oldMyMatchesList = `              onSelectFull={() => { setSelectedSessionId(item.id); window.scrollTo(0,0); }}\r\n              onDelete={isSuperAdmin ? () => deleteScout(item) : null}\r\n              isAdmin={isAdmin}`;
const oldMyMatchesListLF = `              onSelectFull={() => { setSelectedSessionId(item.id); window.scrollTo(0,0); }}\n              onDelete={isSuperAdmin ? () => deleteScout(item) : null}\n              isAdmin={isAdmin}`;

const newMyMatchesList = `              onSelectFull={() => { setSelectedSessionId(item.id); window.scrollTo(0,0); }}
              onDelete={() => handleDeleteScout(item)}
              onRestore={isSuperAdmin && (item.deletionRequested || item.approvalStatus === "pending_deletion") ? () => handleRestoreScout(item) : null}
              isAdmin={isAdmin}
              isSuperAdmin={isSuperAdmin}`;

if (src.includes(oldMyMatchesList)) {
  src = src.replace(oldMyMatchesList, newMyMatchesList);
  console.log('P10: MyMatchesScreen item props updated (CRLF)');
} else if (src.includes(oldMyMatchesListLF)) {
  src = src.replace(oldMyMatchesListLF, newMyMatchesList);
  console.log('P10: MyMatchesScreen item props updated (LF)');
} else {
  console.log('P10: Warning - oldMyMatchesList not matched');
}

// 5. loadSharedHistory - filter out pending_deletion / deletionRequested for regular users
const oldLoadSessions = `            opponent: p.opponent || row.opponent_name,\r\n            approvalStatus: row.approval_status || p.approvalStatus || "approved",\r\n            createdAt: p.createdAt || row.created_at,\r\n          };\r\n        });\r\n        const dbIds = new Set(dbSessions.map((s) => s.id));\r\n        const localLegacy = safeLoad(\`\${STORAGE_KEYS.sessions}:\${currentUserId}\`, []).filter((s) => s.ownerUserId===currentUserId && !dbIds.has(s.id));\r\n        setSessions([...dbSessions, ...localLegacy]);`;
const oldLoadSessionsLF = `            opponent: p.opponent || row.opponent_name,\n            approvalStatus: row.approval_status || p.approvalStatus || "approved",\n            createdAt: p.createdAt || row.created_at,\n          };\n        });\n        const dbIds = new Set(dbSessions.map((s) => s.id));\n        const localLegacy = safeLoad(\`\${STORAGE_KEYS.sessions}:\${currentUserId}\`, []).filter((s) => s.ownerUserId===currentUserId && !dbIds.has(s.id));\n        setSessions([...dbSessions, ...localLegacy]);`;

const newLoadSessions = `            opponent: p.opponent || row.opponent_name,
            approvalStatus: row.approval_status || p.approvalStatus || "approved",
            deletionRequested: row.approval_status === "pending_deletion" || p.deletionRequested === true,
            createdAt: p.createdAt || row.created_at,
          };
        }).filter((s) => {
          const isSuper = profiles.some((pr) => pr.id === currentUserId && pr.role === "super_admin");
          if (isSuper) return true;
          return !s.deletionRequested;
        });
        const dbIds = new Set(dbSessions.map((s) => s.id));
        const localLegacy = safeLoad(\`\${STORAGE_KEYS.sessions}:\${currentUserId}\`, []).filter((s) => s.ownerUserId===currentUserId && !dbIds.has(s.id) && !s.deletionRequested && s.approvalStatus !== "pending_deletion");
        setSessions([...dbSessions, ...localLegacy]);`;

if (src.includes(oldLoadSessions)) {
  src = src.replace(oldLoadSessions, newLoadSessions);
  console.log('P11: loadSharedHistory updated (CRLF)');
} else if (src.includes(oldLoadSessionsLF)) {
  src = src.replace(oldLoadSessionsLF, newLoadSessions);
  console.log('P11: loadSharedHistory updated (LF)');
} else {
  console.log('P11: Warning - oldLoadSessions not matched');
}

// 6. <MyMatchesScreen call in view === "my-matches"
const oldMyMatchesCall = `          {view === "my-matches" && (\r\n            <MyMatchesScreen\r\n              sessions={historySessions}\r\n              onDeleted={id=>setSessions(previous=>previous.filter(item=>item.id!==id))}\r\n              isAdmin={currentUserIsAdmin}\r\n              isSuperAdmin={currentUserIsSuperAdmin}\r\n              ownerAccounts={ownerAccounts}\r\n              onBack={() => setView("dashboard")}\r\n            />\r\n          )}`;
const oldMyMatchesCallLF = `          {view === "my-matches" && (\n            <MyMatchesScreen\n              sessions={historySessions}\n              onDeleted={id=>setSessions(previous=>previous.filter(item=>item.id!==id))}\n              isAdmin={currentUserIsAdmin}\n              isSuperAdmin={currentUserIsSuperAdmin}\n              ownerAccounts={ownerAccounts}\n              onBack={() => setView("dashboard")}\n            />\n          )}`;

const newMyMatchesCall = `          {view === "my-matches" && (
            <MyMatchesScreen
              sessions={historySessions}
              onDeleted={(id) => setSessions((previous) => previous.filter((item) => item.id !== id))}
              onRestore={(id) => {
                setSessions((previous) => previous.map((item) => item.id === id ? { ...item, deletionRequested: false, approvalStatus: "approved" } : item));
                window.dispatchEvent(new Event("boccia-catalog-updated"));
              }}
              isAdmin={currentUserIsAdmin}
              isSuperAdmin={currentUserIsSuperAdmin}
              ownerAccounts={ownerAccounts}
              currentUserId={currentUserId}
              onBack={() => setView("dashboard")}
            />
          )}`;

if (src.includes(oldMyMatchesCall)) {
  src = src.replace(oldMyMatchesCall, newMyMatchesCall);
  console.log('P12: MyMatchesScreen call updated (CRLF)');
} else if (src.includes(oldMyMatchesCallLF)) {
  src = src.replace(oldMyMatchesCallLF, newMyMatchesCall);
  console.log('P12: MyMatchesScreen call updated (LF)');
} else {
  console.log('P12: Warning - oldMyMatchesCall not matched');
}

// 7. PositionMap definition
const oldPositionMap = `function PositionMap({ selected, onSelect }) {\r\n  return <CourtPositionMap selected={selected} onSelect={onSelect} />;\r\n}`;
const oldPositionMapLF = `function PositionMap({ selected, onSelect }) {\n  return <CourtPositionMap selected={selected} onSelect={onSelect} />;\n}`;

const newPositionMap = `function PositionMap({ selected, onSelect, originPosition, originPoint }: { selected: string; onSelect: (pos: string) => void; originPosition?: string; originPoint?: any }) {
  return <CourtPositionMap selected={selected} onSelect={onSelect} originPosition={originPosition} originPoint={originPoint} />;
}`;

if (src.includes(oldPositionMap)) {
  src = src.replace(oldPositionMap, newPositionMap);
  console.log('P13: PositionMap definition updated (CRLF)');
} else if (src.includes(oldPositionMapLF)) {
  src = src.replace(oldPositionMapLF, newPositionMap);
  console.log('P13: PositionMap definition updated (LF)');
} else {
  console.log('P13: Warning - oldPositionMap not matched');
}

// 8. moveWhite stage UI - show origin ball and pass originPosition
const oldMoveWhiteBlock = `              <div\r\n                style={styles.warning}\r\n              >\r\n                <strong>\r\n                  MOVER BRANCA\r\n                </strong>\r\n\r\n                <br />\r\n\r\n                Posição atual:{" "}\r\n                <strong>\r\n                  {whitePosition}\r\n                </strong>\r\n\r\n                <br />\r\n\r\n                Selecione a nova posição.\r\n              </div>\r\n\r\n              <PositionMap\r\n                selected={\r\n                  newWhitePosition\r\n                }\r\n                onSelect={\r\n                  selectNewWhitePosition\r\n                }\r\n              />`;
const oldMoveWhiteBlockLF = `              <div\n                style={styles.warning}\n              >\n                <strong>\n                  MOVER BRANCA\n                </strong>\n\n                <br />\n\n                Posição atual:{" "}\n                <strong>\n                  {whitePosition}\n                </strong>\n\n                <br />\n\n                Selecione a nova posição.\n              </div>\n\n              <PositionMap\n                selected={\n                  newWhitePosition\n                }\n                onSelect={\n                  selectNewWhitePosition\n                }\n              />`;

const newMoveWhiteBlock = `              <div
                style={{
                  ...styles.warning,
                  background: "#fef3c7",
                  borderColor: "#f59e0b",
                  color: "#92400e",
                  lineHeight: 1.5,
                }}
              >
                <strong>MOVER BOLA BRANCA</strong>
                <br />
                Posição original da branca: <strong>{whitePosition}</strong> (marcada com ⚪ no mapa).
                <br />
                {newWhitePosition ? (
                  <span style={{ color: "#15803d", fontWeight: 700 }}>
                    Nova posição selecionada: {newWhitePosition}
                  </span>
                ) : (
                  <span>Toque na quadra para escolher a nova posição da bola branca.</span>
                )}
              </div>

              <PositionMap
                selected={newWhitePosition}
                originPosition={whitePosition}
                originPoint={whitePoint}
                onSelect={selectNewWhitePosition}
              />`;

if (src.includes(oldMoveWhiteBlock)) {
  src = src.replace(oldMoveWhiteBlock, newMoveWhiteBlock);
  console.log('P14: moveWhite stage UI updated (CRLF)');
} else if (src.includes(oldMoveWhiteBlockLF)) {
  src = src.replace(oldMoveWhiteBlockLF, newMoveWhiteBlock);
  console.log('P14: moveWhite stage UI updated (LF)');
} else {
  console.log('P14: Warning - oldMoveWhiteBlock not matched');
}

// 9. EndScore component definition - add penalty section and optional Acerto / Erro
const oldEndScoreDef = `function EndScore({athlete,opponent,athleteColor,opponentColor,endName,onSave,draft,onDraftChange}) {\r\n  const athleteScore=draft.athlete;\r\n  const opponentScore=draft.opponent;\r\n  const setAthleteScore=(value)=>onDraftChange({...draft,athlete:value});\r\n  const setOpponentScore=(value)=>onDraftChange({...draft,opponent:value});`;
const oldEndScoreDefLF = `function EndScore({athlete,opponent,athleteColor,opponentColor,endName,onSave,draft,onDraftChange}) {\n  const athleteScore=draft.athlete;\n  const opponentScore=draft.opponent;\n  const setAthleteScore=(value)=>onDraftChange({...draft,athlete:value});\n  const setOpponentScore=(value)=>onDraftChange({...draft,opponent:value});`;

const newEndScoreDef = `function EndScore({athlete,opponent,athleteColor,opponentColor,endName,onSave,draft,onDraftChange,hasFoul=false,foulCount=0}) {
  const athleteScore=draft.athlete;
  const opponentScore=draft.opponent;
  const penaltyResult=draft.penaltyResult || null;
  const setAthleteScore=(value)=>onDraftChange({...draft,athlete:value});
  const setOpponentScore=(value)=>onDraftChange({...draft,opponent:value});
  const setPenaltyResult=(value)=>onDraftChange({...draft,penaltyResult:value});`;

if (src.includes(oldEndScoreDef)) {
  src = src.replace(oldEndScoreDef, newEndScoreDef);
  console.log('P15: EndScore signature updated (CRLF)');
} else if (src.includes(oldEndScoreDefLF)) {
  src = src.replace(oldEndScoreDefLF, newEndScoreDef);
  console.log('P15: EndScore signature updated (LF)');
} else {
  console.log('P15: Warning - oldEndScoreDef not matched');
}

// EndScore JSX - add penalty buttons right before the save button
const oldEndScoreButton = `      <button\r\n        onClick={() =>\r\n          onSave(\r\n            athleteScore,\r\n            opponentScore\r\n          )\r\n        }\r\n        style={{\r\n          ...styles.button,\r\n          ...styles.green,\r\n          width: "100%",\r\n          marginTop: 15,\r\n        }}\r\n      >`;
const oldEndScoreButtonLF = `      <button\n        onClick={() =>\n          onSave(\n            athleteScore,\n            opponentScore\n          )\n        }\n        style={{\n          ...styles.button,\n          ...styles.green,\n          width: "100%",\n          marginTop: 15,\n        }}\n      >`;

const newEndScorePenaltyAndButton = `      {/* Seção de Penalização */}
      <div style={{
        marginTop: 18,
        padding: "14px 16px",
        background: hasFoul ? "#fffbeb" : "#f8fafc",
        border: hasFoul ? "2px solid #f59e0b" : "1px solid #e2e8f0",
        borderRadius: 12,
        textAlign: "left"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
            <span>⚖️ Penalização</span>
            {hasFoul && (
              <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                {foulCount} falta(s) registrada(s) neste End
              </span>
            )}
          </div>
          <span style={{ fontSize: 11, color: "#64748b" }}>
            Opcional · Registre se houve cobrança de penalização
          </span>
        </div>

        <p style={{ fontSize: 12, color: "#475569", margin: "0 0 10px" }}>
          Houve cobrança de penalização neste End?
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setPenaltyResult(null)}
            style={{
              ...styles.button,
              padding: "9px 6px",
              fontSize: 12,
              fontWeight: 700,
              background: !penaltyResult ? "#334155" : "#f1f5f9",
              color: !penaltyResult ? "#ffffff" : "#475569",
              border: "1px solid #cbd5e1",
              minHeight: 38,
            }}
          >
            Sem penalização
          </button>
          <button
            type="button"
            onClick={() => setPenaltyResult("Acerto")}
            style={{
              ...styles.button,
              padding: "9px 6px",
              fontSize: 12,
              fontWeight: 800,
              background: penaltyResult === "Acerto" ? "#15803d" : "#f0fdf4",
              color: penaltyResult === "Acerto" ? "#ffffff" : "#166534",
              border: penaltyResult === "Acerto" ? "2px solid #166534" : "1px solid #bbf7d0",
              minHeight: 38,
            }}
          >
            ✅ Acerto
          </button>
          <button
            type="button"
            onClick={() => setPenaltyResult("Erro")}
            style={{
              ...styles.button,
              padding: "9px 6px",
              fontSize: 12,
              fontWeight: 800,
              background: penaltyResult === "Erro" ? "#b91c1c" : "#fef2f2",
              color: penaltyResult === "Erro" ? "#ffffff" : "#991b1b",
              border: penaltyResult === "Erro" ? "2px solid #991b1b" : "1px solid #fecaca",
              minHeight: 38,
            }}
          >
            ❌ Erro
          </button>
        </div>
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
      >`;

if (src.includes(oldEndScoreButton)) {
  src = src.replace(oldEndScoreButton, newEndScorePenaltyAndButton);
  console.log('P16: EndScore penalty buttons added (CRLF)');
} else if (src.includes(oldEndScoreButtonLF)) {
  src = src.replace(oldEndScoreButtonLF, newEndScorePenaltyAndButton);
  console.log('P16: EndScore penalty buttons added (LF)');
} else {
  console.log('P16: Warning - oldEndScoreButton not matched');
}

// 10. saveEndScore - save penalty to updatedScores
const oldSaveEndScore = `    const updatedScores = {\r\n      ...scores,\r\n\r\n      [currentEndName]: {\r\n        athlete: a,\r\n        opponent: o,\r\n\r\n        winner:\r\n          a === o\r\n            ? "Empate"\r\n            : a > o\r\n            ? athlete\r\n            : opponent,\r\n      },\r\n    };\r\n\r\n    setScores(updatedScores);\r\n    setEndScoreDraft({athlete:"",opponent:""});`;
const oldSaveEndScoreLF = `    const updatedScores = {\n      ...scores,\n\n      [currentEndName]: {\n        athlete: a,\n        opponent: o,\n\n        winner:\n          a === o\n            ? "Empate"\n            : a > o\n            ? athlete\n            : opponent,\n      },\n    };\n\n    setScores(updatedScores);\n    setEndScoreDraft({athlete:"",opponent:""});`;

const newSaveEndScore = `    const updatedScores = {
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
        penalty: endScoreDraft?.penaltyResult || null,
      },
    };

    setScores(updatedScores);
    setEndScoreDraft({athlete:"",opponent:"",penaltyResult:null});`;

if (src.includes(oldSaveEndScore)) {
  src = src.replace(oldSaveEndScore, newSaveEndScore);
  console.log('P17: saveEndScore penalty saving updated (CRLF)');
} else if (src.includes(oldSaveEndScoreLF)) {
  src = src.replace(oldSaveEndScoreLF, newSaveEndScore);
  console.log('P17: saveEndScore penalty saving updated (LF)');
} else {
  console.log('P17: Warning - oldSaveEndScore not matched');
}

// 11. <EndScore call in BochaScout render - pass hasFoul and foulCount
const oldEndScoreCall = `          {stage === "endScore" && (\r\n            <EndScore draft={endScoreDraft} onDraftChange={value=>{pushUndoSnapshot();setEndScoreDraft(value);}}`;
const oldEndScoreCallLF = `          {stage === "endScore" && (\n            <EndScore draft={endScoreDraft} onDraftChange={value=>{pushUndoSnapshot();setEndScoreDraft(value);}}`;

const newEndScoreCall = `          {stage === "endScore" && (() => {
            const endFouls = playsHistory.filter((p) => p.end === currentEndName && p.play === "Falta");
            return (
              <EndScore draft={endScoreDraft} onDraftChange={value=>{pushUndoSnapshot();setEndScoreDraft(value);}}
                hasFoul={endFouls.length > 0}
                foulCount={endFouls.length}`;

const oldEndScoreCallEnd = `              onSave={\r\n                saveEndScore\r\n              }\r\n            />\r\n          )}`;
const oldEndScoreCallEndLF = `              onSave={\n                saveEndScore\n              }\n            />\n          )}`;

const newEndScoreCallEnd = `              onSave={
                saveEndScore
              }
            />
          );
          })()}`;

if (src.includes(oldEndScoreCall)) {
  src = src.replace(oldEndScoreCall, newEndScoreCall);
  console.log('P18a: EndScore call header updated (CRLF)');
} else if (src.includes(oldEndScoreCallLF)) {
  src = src.replace(oldEndScoreCallLF, newEndScoreCall);
  console.log('P18a: EndScore call header updated (LF)');
} else {
  console.log('P18a: Warning - oldEndScoreCall not matched');
}

if (src.includes(oldEndScoreCallEnd)) {
  src = src.replace(oldEndScoreCallEnd, newEndScoreCallEnd);
  console.log('P18b: EndScore call footer updated (CRLF)');
} else if (src.includes(oldEndScoreCallEndLF)) {
  src = src.replace(oldEndScoreCallEndLF, newEndScoreCallEnd);
  console.log('P18b: EndScore call footer updated (LF)');
} else {
  console.log('P18b: Warning - oldEndScoreCallEnd not matched');
}

fs.writeFileSync(file, src, 'utf8');
console.log('Finished updating BochaScout.tsx. New length:', src.length);
