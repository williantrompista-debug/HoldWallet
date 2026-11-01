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

## Limitações do protótipo

- Tudo fica salvo no `localStorage` do aparelho. Votos de outras pessoas **não sincronizam** ainda.
- O link compartilhado carrega o pedido dentro da própria URL, então quem abre consegue ver e votar localmente, mas o voto não volta para o dono.

## Próximos passos

1. Backend (Supabase ou Firebase): pedidos, votos e comentários sincronizados, login por Google/e-mail
2. Moderação do mural e denúncia de conteúdo
3. Notificação quando o prazo acabar
4. "Adivinha o preço": minijogo para engajamento
5. Publicar nas lojas (Capacitor ou TWA)
6. Monetização: parcerias com fintechs ("em vez de comprar, invista"), cupons, versão premium com relatórios
