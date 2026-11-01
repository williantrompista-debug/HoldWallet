# HoldWallet 🦸👛

**Segura a carteira. Deixa a galera decidir.**

Antes de gastar, você cadastra o que quer comprar, o preço e o motivo. Amigos (pelo WhatsApp) ou estranhos (no mural) votam **Compra** ou **Segura** e deixam argumentos. Depois de 24 horas você decide, e cada compra segurada entra no seu contador de economia.

**Testar no celular:** https://williantrompista-debug.github.io/HoldWallet/

No celular, use "Adicionar à tela inicial" para instalar como app.

## Rodando localmente

É um web app estático, sem backend. Basta servir a pasta:

```bash
python3 -m http.server 8080
# abra http://localhost:8080 no navegador (modo celular)
```

Cada push na branch `main` publica automaticamente no GitHub Pages (branch `gh-pages`).

## O que já funciona (v0.1)

- Início com mascote, contadores e feed
- Criar pedido (item, preço, motivo, **o que já tem parecido**, alternativa, foto, prazo, público ou só com link)
- Mural com filtros (abertos, mais votados, decididos)
- Página do pedido: votar, comentar a favor ou contra, compartilhar no WhatsApp, copiar link
- **Perguntas antes de votar**: quem vota pode perguntar ("O que você usa hoje?", "Por que precisa tanto?") e o dono responde na própria página
- Decisão final (comprei / segurei) e contador de economia
- Instalável (PWA) com cache offline básico
- Dados de exemplo para o mural não nascer vazio

## Dois modos de funcionamento

| Modo | Quando | Onde ficam os dados |
|---|---|---|
| **Demonstração** | `config.js` vazio | Só no aparelho (`localStorage`). O link compartilhado leva o pedido na própria URL, mas os votos não voltam para o dono |
| **Online** | `config.js` com as chaves do Supabase | No banco. Ver o mural e abrir links é livre; votar, pedir opinião, perguntar, responder e comentar exigem conta (Google ou e-mail e senha). Tudo sincroniza em tempo real |

## Ligando o modo online (Supabase, grátis)

1. Crie uma conta e um projeto em https://supabase.com (plano Free).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. (Opcional) Rode também `supabase/seed.sql` para o mural já nascer com exemplos.
4. **Authentication → URL Configuration**: em *Site URL* coloque a URL do site publicado (ex.: `https://williantrompista-debug.github.io/HoldWallet/`) e adicione a mesma em *Redirect URLs*.
5. Em **Project Settings → API Keys**, copie a **Project URL** e a chave **anon / publishable** e cole em `config.js`.
6. Faça o push. O site publicado passa a usar o banco.

### Login com e-mail e senha
Já vem ligado. Por padrão o Supabase exige confirmar o e-mail, e o envio embutido é limitado a poucos e-mails por hora. Para a fase de testes, desligue a confirmação em **Authentication → Sign In / Providers → Email → Confirm email**. Para produção, configure um SMTP próprio (ex.: Resend, grátis até 3 mil e-mails/mês) em **Project Settings → Authentication → SMTP**.

### Login com Google (opcional)
1. No [Google Cloud Console](https://console.cloud.google.com/apis/credentials), crie um projeto e, em *Credentials*, um **OAuth client ID** do tipo *Web application*.
2. Em *Authorized redirect URIs*, cole a URL de callback que o Supabase mostra em **Authentication → Sign In / Providers → Google** (formato `https://SEU-PROJETO.supabase.co/auth/v1/callback`).
3. Copie o *Client ID* e o *Client secret* para essa mesma tela do Supabase e ative o provedor.

Como funciona a segurança: ler é livre; qualquer escrita exige conta de verdade (logins anônimos são bloqueados mesmo que alguém os ative no painel); cada pessoa vota uma vez por pedido; só o dono decide e responde perguntas; pedidos "só com link" não aparecem no mural; nada muda depois do prazo. As regras estão em `supabase/schema.sql` (RLS).

## Próximos passos

1. Perfil (foto e apelido) e página pública de cada pessoa
2. Moderação do mural e denúncia de conteúdo
3. Notificação quando o prazo acabar
4. "Adivinha o preço": minijogo para engajamento
5. Publicar nas lojas (Capacitor ou TWA)
6. Monetização: parcerias com fintechs ("em vez de comprar, invista"), cupons, versão premium com relatórios
