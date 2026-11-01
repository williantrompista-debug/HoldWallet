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
| **Online** | `config.js` com as chaves do Supabase | No banco. Votos, perguntas e comentários sincronizam entre aparelhos e atualizam em tempo real |

## Ligando o modo online (Supabase, grátis)

1. Crie uma conta e um projeto em https://supabase.com (plano Free).
2. No projeto, abra **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
3. (Opcional) Rode também `supabase/seed.sql` para o mural já nascer com exemplos.
4. Em **Authentication → Sign In / Providers**, ative **Anonymous sign-ins**. É assim que cada aparelho ganha uma identidade sem cadastro.
5. Em **Project Settings → API**, copie a **Project URL** e a chave **anon / publishable** e cole em `config.js`.
6. Faça o push. O site publicado passa a usar o banco.

Como funciona a segurança: cada pessoa vota uma vez por pedido, só o dono pode decidir e responder perguntas, pedidos "só com link" não aparecem no mural, e nada pode ser alterado depois do prazo. As regras estão em `supabase/schema.sql` (RLS).

## Próximos passos

1. Login com Google (para a pessoa manter os pedidos ao trocar de aparelho)
2. Moderação do mural e denúncia de conteúdo
3. Notificação quando o prazo acabar
4. "Adivinha o preço": minijogo para engajamento
5. Publicar nas lojas (Capacitor ou TWA)
6. Monetização: parcerias com fintechs ("em vez de comprar, invista"), cupons, versão premium com relatórios
