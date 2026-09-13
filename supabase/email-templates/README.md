# Configuração de e-mails

No projeto whufbagsxtdzekooamxf, Authentication → URL Configuration:
- Site URL: https://bocha-scout.vercel.app
- Redirect URLs: preservar os destinos existentes e adicionar https://bocha-scout.vercel.app/ e https://bocha-scout.vercel.app/?auth=confirm

Authentication → Email Templates:
- Confirm signup: assunto "Confirme seu e-mail no Bocha Scout", conteúdo confirmation.html.
- Reset password: assunto "Recupere seu acesso ao Bocha Scout", conteúdo recovery.html.

O modelo de confirmação abre o app e verifica TokenHash pelo Supabase. O modelo de recuperação preserva ConfirmationURL e o fluxo PASSWORD_RECOVERY existente. Nunca substituir variáveis por tokens reais.

Os arquivos versionados não alteram automaticamente o painel Supabase. A aplicação dos modelos e URLs no painel deve ser confirmada separadamente.
