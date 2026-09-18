
  const [showMoreFundamentals, setShowMoreFundamentals] = useState(false);
  const [finalSelectedSide, setFinalSelectedSide] = useState("athlete");

  const availablePlays = useMemo(() => {
    return PLAYS.filter((play) =>
      foundationAllowed(
        play,
        sessionKind,
        gameType,
        selectedColor === athleteColor ? athleteClass : opponentClass
      )
    );
  }, [sessionKind, gameType, selectedColor, athleteColor, athleteClass, opponentClass]);

  useEffect(() => {
    if (stage !== "play") {
      setShowMoreFundamentals(false);
    }
  }, [stage, selectedResult, selectedColor]);

  // ... existing code ...

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
                {(showMoreFundamentals ? availablePlays : availablePlays.slice(0, 6)).map((play) => {
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
                      <img className="scout-play-icon" src={playAsset(play)} alt="" />
                      <span className="scout-play-label">{play}</span>
                    </button>
                  );
                })}
              </div>
              {availablePlays.length > 6 && (
                <button type="button" className="scout-more-fundamentals" onClick={() => setShowMoreFundamentals((value) => !value)}>
                  {showMoreFundamentals ? "Menos fundamentos" : "Mais fundamentos"}
                  <span aria-hidden="true">⌄</span>
                </button>
              )}
            </div>
          )}
