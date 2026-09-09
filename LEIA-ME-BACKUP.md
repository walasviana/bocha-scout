# Cópia de segurança do código — Bocha Scout

Data: 08/09/2026
Site: https://bochascout.pages.dev/
Publicação correspondente: 6523227c-e18e-4f1b-b785-95ec68a9c2a0

## O que está incluído

- Código completo em src, imagens em public e configurações do projeto.
- Scripts de preparação e de suporte offline.
- package.json e pnpm-lock.yaml para reinstalar as dependências.
- A pasta dist é gerada ao compilar; a cópia pronta da publicação está no ZIP entregue ao proprietário.
- backup-support: alterações de banco disponíveis nesta sessão e testes auxiliares.

O README.md original foi preservado por fidelidade à cópia; algumas descrições antigas nele não representam mais a interface atual. Este documento descreve esta cópia.

## Rodar e recompilar

Instale Node.js 22 LTS ou mais recente e pnpm. No terminal, dentro desta pasta:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Para gerar a versão de produção, incluindo o service worker offline:

```sh
pnpm run build
```

O comando executa o prebuild existente e gera a pasta dist. Não remova os scripts de prebuild. A pasta node_modules não está no ZIP: ela é recriada pela instalação acima.

## Publicar novamente

No Cloudflare Pages, publique o conteúdo de dist como um site estático. O projeto atual chama-se bochascout. No repositório, execute o build para gerar dist. O ZIP de backup entregue separadamente também contém os arquivos já compilados.

## Conexão ao Supabase

O código usa o projeto whufbagsxtdzekooamxf. A URL e a chave publicável existentes estão em src/lib/supabase.ts. Chave publicável não é uma senha administrativa. Nunca coloque service_role, senha do banco ou token de administração no código do navegador.

Para trocar o projeto, as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são lidas na compilação. O identificador de armazenamento da sessão em src/lib/scoutAutosave.ts também precisa ser ajustado se o projeto mudar.

## Limite desta cópia

Este repositório é uma cópia do código e dos arquivos publicados. NÃO é um backup completo do banco do Supabase. Não contém os registros reais de atletas, partidas, contas, senhas, configurações de autenticação nem rascunhos salvos em aparelhos.

Os SQLs de backup-support são alterações incrementais, dependentes das tabelas, políticas e funções que já existiam. Eles não recriam sozinhos um banco novo e não devem ser executados novamente no banco atual. Para restaurar todo o sistema em outro projeto é necessário um backup separado do banco, da autenticação e das configurações do Supabase.

O envio do link de recuperação de senha foi implementado, mas a configuração de retorno do e-mail não foi conferida, conforme solicitado.

## Recursos desta versão

Mapa de calor atualizado no scout e nos relatórios, alinhamento de parciais no PDF, filtros de atletas, aprovação de correções pelo superadministrador, notificações por conta, termos de cadastro, recuperação de senha, salvamento automático, reserva offline, Início/Voltar à partida e abandono com confirmação.
