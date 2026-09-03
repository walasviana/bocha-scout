# Bocha Scout — versão completa atualizada

Protótipo React/Vite para scout técnico de Bocha Paralímpica.

## Regras e recursos desta versão

- Cadastro único de atletas com nome, classe BC1–BC4 e observações.
- No histórico existe apenas o filtro **Atleta**; a mesma pessoa pode ter participado como atleta principal ou adversário.
- Em **Treino**, o adversário pode ser de qualquer classe.
- Em **Campeonato**, o adversário Individual deve ser da mesma classe.
- Pares e Equipes usam nome da equipe/país.
- Scout por End com posição da branca, cor, resultado e fundamento.
- **Entregar Bola** em botão compacto: zera as bolas restantes da cor selecionada, registra a entrega e não contabiliza erro técnico.
- **Desfazer última ação** restaura o estado anterior.
- Desempenho ao vivo compacto, mostrando primeiro a **parcial atual** e depois o **acumulado da partida**, para os dois competidores.
- Precisão = Acertos / jogadas válidas.
- Eficiência = (Acertos + 0,5 × Funcionais) / jogadas válidas.
- Mapa de calor analisa apenas as jogadas do atleta selecionado.
- Filtro de cor acima do mapa: Todas / Vermelho / Azul.
- Escala visual: 0–20% vermelho; 21–40% laranja; 41–60% amarelo; 61–80% verde-claro; 81–100% verde-escuro.
- Modo **Saídas de jogo** mostra somente as posições em que o atleta realizou saídas; as demais ficam neutras.
- Histórico com melhor posição, posição de atenção, fundamentos, desempenho por cor e partidas.
- O botão de PDF foi removido da tela final.
- Na partida finalizada, **Mais detalhes** abre o mapa do adversário e o comparativo de melhor posição/posição de atenção entre os dois competidores.
- Backup/importação JSON via localStorage.

## Rodar

```bash
npm install
npm run dev
```
