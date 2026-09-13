# Pacote funcional do Bocha Scout

Implementação incremental sobre a versão existente, sem migração de banco ou alterações de permissões.

- Individual e Pares: quatro parciais. Equipes: seis. Desempates continuam separados.
- O desempenho por parcial usa `calcStats`, compartilhado com o relatório. Acerto vale 100%, Funcional 50%, Erro 0%. Sem jogadas aparece um traço.
- Em Pares/Equipes, selecione o atleta de cada lançamento. Os registros antigos continuam identificados pelo lado, pois não há como reconstruir o atleta de cada bola.
- Ao Vivo é o padrão. O cronômetro é iniciado explicitamente e para na seleção do resultado; pode ser pausado. Sem medição não é gerado um tempo. Reabrir o aplicativo deixa o cronômetro parado, sem incluir o tempo com o app fechado.
- Scout de Partida Gravada exige data real. O tempo, opcional, é digitado em segundos observados no vídeo.
- Após escolher o quadrado, marque/arraste a branca na ampliação de 1 m. Um arraste completo é uma ação do Desfazer; confirmar, escolher cor, atleta e resultado também são ações independentes. O botão Excluir continua separado.
- A posição usa coordenadas normalizadas de 0 a 1 a partir do canto superior esquerdo, mantendo a orientação da quadra. Mapas antigos continuam por quadrado, sem inventar pontos.
- O PDF conserva cabeçalho, cores e comparação dos dois lados. Inclui porcentagens por parcial junto ao placar, os três resultados com quantidades e porcentagens, todos os fundamentos e mapas. O histórico de jogadas fica exclusivamente no aplicativo para manter o PDF compacto. Em equipes, inclui análises dos atletas identificados.
- Metadados novos ficam no JSON já salvo em `scout_sessions.payload` e no rascunho. Não há novas colunas. Campos ausentes são tratados como não registrados.

## Verificação

```sh
npm install
npm run typecheck
npm test
npm run build
```

Os testes de navegador usam somente dados fictícios e interceptam todas as chamadas do Supabase. Não gravam partidas de teste no banco real.

Com Vite em `http://127.0.0.1:5173`, Playwright disponível e Chrome instalado:

```sh
node tests/browser/flow-test.cjs
node tests/browser/advanced-test.cjs
node tests/browser/finish-test.cjs
```

Caso Playwright esteja em um runtime separado, informe seu caminho em `SCOUT_PLAYWRIGHT_MODULE`. `SCOUT_BROWSER_CHANNEL` permite selecionar outro canal instalado. Capturas vão para `tests/artifacts/`.

Cobertura executada: desktop 1280 px e celular 390 px; posição exata, Desfazer por ação, cronômetro, tempo ausente, modo gravado e data obrigatória, filtro de parcial, recarga do rascunho, seis parciais de Equipes, identificação de atleta e Mover branca com Erro/Funcional. PDF fictício com 96 lançamentos, seis parciais e dois desempates teve texto e renderização conferidos. Na revisão compacta, as páginas de histórico foram removidas do PDF, preservando os registros no app.

A validação de persistência no navegador usa respostas simuladas do Supabase. A homologação com uma conta real e a revisão visual pelo usuário continuam recomendadas antes da publicação. Hardening final de GitHub, Supabase e permissões permanece fora deste pacote.


## Radar e interface (13/09/2026)
- Home com ícones vetoriais e ações Iniciar Scout / Histórico e Análises; cadastros no menu Minha conta.
- Radar usa calcStats: ausência null, erro zero; lacunas não são preenchidas como zero. PDF compara lados em três radares na primeira página, com placar e percentuais coloridos.
- Comparador recebe as sessões autorizadas do Histórico; coleta coletiva sem playerId não é atribuída a um atleta. Cadastros existentes preservados.
- RLS scout_sessions ativo, SELECT owner_id = auth.uid() OR is_admin(); is_admin consulta profiles. Não foi feito hardening geral.
- TypeScript e build passaram. tests/browser/radar-interface.cjs valida Home/radar mobile, ausência vs zero, período sem jogadas, exclusão de coletivos sem identificação, PDF de duas páginas, seleção de jogador removida e confirmação expirada. Chamadas Supabase simuladas, sem envio real de e-mails.
- Modelos e destinos do Supabase preparados em supabase/email-templates; aplicação no painel permanece pendente por indisponibilidade de acesso às configurações Auth.
