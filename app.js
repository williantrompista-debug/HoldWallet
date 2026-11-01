/* HoldWallet · protótipo v0.1
 * Tudo roda no navegador e fica salvo em localStorage.
 * Próximo passo: trocar o "store" por um backend (Supabase/Firebase) para votos sincronizados.
 */
(() => {
  'use strict';

  const KEY = 'holdwallet.v1';
  const HOUR = 3600 * 1000;

  // ---------- util ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function timeLeft(req) {
    const ms = req.deadline - Date.now();
    if (req.decision) return req.decision === 'held' ? 'segurou' : 'comprou';
    if (ms <= 0) return 'encerrado';
    const h = Math.floor(ms / HOUR);
    if (h >= 48) return `${Math.floor(h / 24)} dias`;
    if (h >= 1) return `${h}h restantes`;
    return `${Math.max(1, Math.floor(ms / 60000))} min`;
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (t.hidden = true), 2200);
  }

  // ---------- store ----------
  function seed() {
    const now = Date.now();
    const mk = (o) => ({
      id: uid(), createdAt: now - o.ago * HOUR, deadline: now - o.ago * HOUR + 24 * HOUR,
      votes: { buy: o.buy, hold: o.hold }, myVote: null, comments: o.comments || [], questions: o.questions || [],
      decision: o.decision || null, mine: false, scope: 'mural', imageUrl: '', alternative: o.alt || '', owns: o.owns || '', ...o,
    });
    return [
      mk({ item: 'iPhone 17 Pro', price: 9499, author: 'Lucas', ago: 3, buy: 4, hold: 23,
        reason: 'Meu 13 ainda funciona mas a bateria tá fraca e quero a câmera nova pra postar.',
        owns: 'iPhone 13, 3 anos de uso, bateria em 78%',
        alt: 'Trocar a bateria por R$ 400',
        questions: [
          { id: 'q1', author: 'Ana', text: 'Você trabalha com foto ou é só pra postar no Instagram?', answer: 'Só pra postar mesmo, não é trabalho.' },
          { id: 'q2', author: 'Rafa', text: 'Vai pagar à vista ou parcelado?', answer: '12x no cartão.' },
          { id: 'q3', author: 'Bia', text: 'Já pensou num 15 ou 16 seminovo?', answer: '' },
        ],
        comments: [
          { side: 'hold', author: 'Ana', text: 'Troca a bateria e segura mais 1 ano. Câmera do 13 ainda é ótima.' },
          { side: 'hold', author: 'Rafa', text: 'R$ 9.500 é quase um ano de academia + viagem. Segura.' },
          { side: 'buy', author: 'Dudu', text: 'Se trabalha com conteúdo, é ferramenta. Compra.' },
        ] }),
      mk({ item: 'Air fryer 12L', price: 549, author: 'Mari', ago: 5, buy: 31, hold: 6,
        reason: 'Moro sozinha, peço delivery 4x por semana. Acho que ia cozinhar mais.',
        owns: 'Só fogão e micro-ondas. Nunca tive air fryer.',
        questions: [
          { id: 'q4', author: 'Beto', text: 'Você cozinha hoje ou é só a ideia de cozinhar?', answer: 'Cozinho pouco, mas é porque dá preguiça de usar o forno.' },
        ],
        comments: [
          { side: 'buy', author: 'Carla', text: 'Se paga em 2 meses de delivery a menos. Vai.' },
          { side: 'hold', author: 'Beto', text: 'Pega uma de 5L, 12L é exagero pra uma pessoa.' },
        ] }),
      mk({ item: 'Tênis de corrida Pegasus', price: 899, author: 'Thi', ago: 10, buy: 12, hold: 15,
        reason: 'Comecei a correr mês passado, tô usando um tênis de academia velho.',
        owns: 'Tênis de academia de 2 anos, solado gasto',
        alt: 'Modelo do ano passado em promoção por R$ 520',
        comments: [
          { side: 'buy', author: 'Pri', text: 'Tênis certo evita lesão. Mas compra o do ano passado.' },
        ] }),
      mk({ item: 'Curso de inglês online (anual)', price: 1890, author: 'Jéssica', ago: 20, buy: 27, hold: 8,
        reason: 'Preciso pra entrevista em multinacional. Já tentei app grátis e não evoluo.',
        comments: [
          { side: 'buy', author: 'Nando', text: 'Investimento em carreira. Se tem a entrevista, vale.' },
        ] }),
      mk({ item: 'Monitor ultrawide 34"', price: 2299, author: 'Gabriel', ago: 30, buy: 9, hold: 19, decision: 'held',
        reason: 'Trabalho home office, acho que ia render mais com mais tela.',
        alt: 'Segundo monitor usado por R$ 500' }),
      mk({ item: 'Cadeira gamer', price: 1299, author: 'Vini', ago: 40, buy: 5, hold: 28, decision: 'held',
        reason: 'Minha cadeira atual rangendo e dói as costas.',
        alt: 'Cadeira de escritório ergonômica por R$ 700' }),
    ];
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    const data = { requests: seed(), nick: '' };
    save(data);
    return data;
  }
  function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

  const db = load();
  const getReq = (id) => db.requests.find((r) => r.id === id);

  // ---------- compartilhamento (codifica o pedido na URL) ----------
  function encodeReq(r) {
    const slim = { id: r.id, item: r.item, price: r.price, reason: r.reason, owns: r.owns, alternative: r.alternative, imageUrl: r.imageUrl, author: r.author, createdAt: r.createdAt, deadline: r.deadline, scope: r.scope };
    return btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
  }
  function decodeReq(s) {
    try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; }
  }
  function shareUrl(r) {
    const base = location.href.split('#')[0];
    return `${base}#/pedido/${r.id}?d=${encodeReq(r)}`;
  }
  function shareText(r) {
    const owns = r.owns ? `\nJá tenho: ${r.owns}` : '';
    return `🦸 HoldWallet\n\nTô querendo comprar: *${r.item}* por *${brl(r.price)}*.\nMotivo: ${r.reason}${owns}\n\nCompro ou seguro? Vota aí 👇\n${shareUrl(r)}`;
  }

  // ---------- render helpers ----------
  const app = $('#app');
  const tpl = (id) => document.importNode($(`#${id}`).content, true);

  function pct(r) {
    const t = r.votes.buy + r.votes.hold;
    const b = t ? Math.round((r.votes.buy / t) * 100) : 50;
    return { t, b, h: 100 - b };
  }

  function cardEl(r) {
    const n = tpl('tpl-card');
    const el = $('.card', n);
    el.dataset.id = r.id;
    $('.card-price', n).textContent = brl(r.price);
    $('.card-time', n).textContent = timeLeft(r);
    $('.card-item', n).textContent = r.item;
    $('.card-reason', n).textContent = r.reason;
    const p = pct(r);
    $('.bar-buy', n).style.width = p.b + '%';
    $('.bar-hold', n).style.width = p.h + '%';
    $('.card-votes', n).textContent = `🛒 ${r.votes.buy} · ✋ ${r.votes.hold}`;
    const badge = $('.card-badge', n);
    if (r.decision === 'held') { badge.textContent = 'Segurou ✋'; badge.classList.add('badge-held'); }
    else if (r.decision === 'bought') { badge.textContent = 'Comprou 🛒'; badge.classList.add('badge-bought'); }
    else if (r.deadline < Date.now()) { badge.textContent = 'Encerrado'; badge.classList.add('badge-closed'); }
    else { badge.textContent = 'Votando'; badge.classList.add('badge-open'); }
    el.addEventListener('click', () => (location.hash = `#/pedido/${r.id}`));
    return n;
  }

  function renderList(container, list, emptyMsg) {
    container.innerHTML = '';
    if (!list.length) {
      container.innerHTML = `<div class="empty">${emptyMsg}</div>`;
      return;
    }
    list.forEach((r) => container.appendChild(cardEl(r)));
  }

  function stats() {
    const mine = db.requests.filter((r) => r.mine);
    const held = mine.filter((r) => r.decision === 'held');
    const bought = mine.filter((r) => r.decision === 'bought');
    return {
      saved: held.reduce((s, r) => s + Number(r.price), 0),
      held: held.length,
      bought: bought.length,
      open: mine.filter((r) => !r.decision && r.deadline > Date.now()).length,
      votes: mine.reduce((s, r) => s + r.votes.buy + r.votes.hold, 0),
    };
  }
  function fillStats(root) {
    const s = stats();
    $$('[data-stat]', root).forEach((el) => {
      const k = el.dataset.stat;
      el.textContent = k === 'saved' ? brl(s.saved) : s[k];
    });
  }

  // ---------- views ----------
  const views = {
    home() {
      const n = tpl('tpl-home');
      fillStats(n);
      const open = db.requests.filter((r) => !r.decision && r.deadline > Date.now()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
      renderList($('#home-feed', n), open, 'Nada no mural ainda. Seja o primeiro!');
      return n;
    },

    novo() {
      const n = tpl('tpl-novo');
      const form = $('#form-novo', n);
      if (db.nick) form.author.value = db.nick;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(form);
        const hours = Number(f.get('hours'));
        const r = {
          id: uid(),
          item: f.get('item').trim(),
          price: Number(f.get('price')),
          reason: f.get('reason').trim(),
          owns: (f.get('owns') || '').trim(),
          alternative: (f.get('alternative') || '').trim(),
          imageUrl: (f.get('imageUrl') || '').trim(),
          author: (f.get('author') || '').trim() || 'Anônimo',
          scope: f.get('scope'),
          createdAt: Date.now(),
          deadline: Date.now() + hours * HOUR,
          votes: { buy: 0, hold: 0 },
          myVote: null,
          comments: [],
          questions: [],
          decision: null,
          mine: true,
        };
        db.nick = r.author === 'Anônimo' ? '' : r.author;
        db.requests.unshift(r);
        save(db);
        toast('Votação aberta! Agora manda pra galera.');
        location.hash = `#/pedido/${r.id}`;
      });
      return n;
    },

    mural() {
      const n = tpl('tpl-mural');
      const feed = $('#mural-feed', n);
      const filters = $('#mural-filters', n);
      const apply = (f) => {
        let list = db.requests.filter((r) => r.scope === 'mural' || r.mine);
        if (f === 'open') list = list.filter((r) => !r.decision && r.deadline > Date.now()).sort((a, b) => b.createdAt - a.createdAt);
        if (f === 'hot') list = list.slice().sort((a, b) => (b.votes.buy + b.votes.hold) - (a.votes.buy + a.votes.hold));
        if (f === 'done') list = list.filter((r) => r.decision || r.deadline <= Date.now());
        renderList(feed, list, 'Nada por aqui.');
      };
      filters.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        $$('.chip', filters).forEach((c) => c.classList.toggle('active', c === b));
        apply(b.dataset.f);
      });
      apply('open');
      return n;
    },

    meus() {
      const n = tpl('tpl-meus');
      fillStats(n);
      const mine = db.requests.filter((r) => r.mine).sort((a, b) => b.createdAt - a.createdAt);
      renderList($('#meus-feed', n), mine, 'Você ainda não pediu opinião. <br><a href="#/novo" class="link">Criar o primeiro pedido →</a>');
      return n;
    },

    como() { return tpl('tpl-como'); },

    pedido(id, query) {
      let r = getReq(id);
      if (!r && query.get('d')) {
        const imported = decodeReq(query.get('d'));
        if (imported && imported.id === id) {
          r = { ...imported, votes: { buy: 0, hold: 0 }, myVote: null, comments: [], questions: [], decision: null, mine: false, imported: true };
          db.requests.unshift(r);
          save(db);
        }
      }
      if (!r) {
        const d = document.createElement('section');
        d.className = 'section';
        d.innerHTML = '<div class="empty">Pedido não encontrado.<br><a href="#/mural" class="link">Ir pro mural →</a></div>';
        return d;
      }

      const n = tpl('tpl-detalhe');
      const root = $('.detail', n);
      $('.detail-price', root).textContent = brl(r.price);
      $('.detail-time', root).textContent = timeLeft(r);
      $('.detail-item', root).textContent = r.item;
      $('.detail-author', root).textContent = `por ${r.author || 'Anônimo'} · ${r.scope === 'mural' ? 'mural público' : 'só com link'}`;
      $('.detail-reason', root).textContent = r.reason;
      const ownsBox = $('.detail-owns', root);
      if (r.owns) {
        $('.detail-owns-text', root).textContent = r.owns;
      } else {
        ownsBox.classList.add('is-empty');
        $('.detail-owns-text', root).innerHTML = r.mine
          ? '<span class="muted">Você não contou o que já tem. Se alguém perguntar, responda abaixo.</span>'
          : '<span class="muted">A pessoa não contou o que já tem. Pergunte antes de votar 👇</span>';
      }
      if (r.alternative) { $('.detail-alt', root).hidden = false; $('.detail-alternative', root).textContent = r.alternative; }
      if (r.imageUrl && /^https?:\/\//i.test(r.imageUrl) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(r.imageUrl)) {
        const box = $('.detail-img', root); box.hidden = false; $('img', box).src = r.imageUrl;
      }

      const closed = !!r.decision || r.deadline <= Date.now();

      const paint = () => {
        const p = pct(r);
        $('.bar-buy', root).style.width = p.b + '%';
        $('.bar-hold', root).style.width = p.h + '%';
        $('.c-buy', root).textContent = `🛒 Compra ${p.b}% (${r.votes.buy})`;
        $('.c-hold', root).textContent = `✋ Segura ${p.h}% (${r.votes.hold})`;
        $$('[data-vote]', root).forEach((b) => {
          b.classList.toggle('chosen', r.myVote === b.dataset.vote);
          b.disabled = closed;
        });
        $('.vote-note', root).textContent = closed ? 'Votação encerrada.' : r.myVote ? 'Seu voto foi registrado. Toque de novo para mudar.' : r.mine ? 'Você também pode votar no seu próprio pedido, mas sem trapaça, hein?' : 'Seu voto é anônimo e não compra nada.';
      };
      $$('[data-vote]', root).forEach((b) => b.addEventListener('click', () => {
        const v = b.dataset.vote;
        if (r.myVote === v) return;
        if (r.myVote) r.votes[r.myVote]--;
        r.votes[v]++;
        r.myVote = v;
        save(db); paint();
        toast(v === 'buy' ? 'Votou: Compra! 🛒' : 'Votou: Segura! ✋');
      }));
      paint();

      // compartilhar
      $('[data-action="whatsapp"]', root).addEventListener('click', () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText(r))}`, '_blank');
      });
      $('[data-action="copy"]', root).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(shareUrl(r)); toast('Link copiado!'); }
        catch (e) { prompt('Copie o link:', shareUrl(r)); }
      });

      // decisão (só do dono)
      const decideBox = $('.decide-box', root);
      const banner = $('.decided-banner', root);
      const showDecision = () => {
        if (!r.decision) return;
        decideBox.hidden = true;
        banner.hidden = false;
        banner.className = `decided-banner ${r.decision}`;
        banner.textContent = r.decision === 'held' ? `✋ Você segurou ${brl(r.price)}. Boa!` : `🛒 Você comprou. Que seja bem usado!`;
      };
      if (r.mine && !r.decision) {
        decideBox.hidden = false;
        $$('[data-decide]', root).forEach((b) => b.addEventListener('click', () => {
          r.decision = b.dataset.decide;
          save(db); showDecision();
          $$('[data-vote]', root).forEach((x) => (x.disabled = true));
          toast(r.decision === 'held' ? 'Economia registrada 💚' : 'Decisão registrada');
        }));
      }
      showDecision();

      // perguntas antes de votar
      r.questions = r.questions || [];
      const qList = $('.questions', root);
      const qForm = $('.form-question', root);
      const paintQuestions = () => {
        qList.innerHTML = r.questions.length ? '' : '<li class="muted small q-empty">Ninguém perguntou nada ainda.</li>';
        r.questions.forEach((q) => {
          const li = document.createElement('li');
          li.className = 'q' + (q.answer ? ' answered' : '');
          let html = `<div class="q-text">❓ ${esc(q.text)}<span class="who">${esc(q.author || 'Anônimo')}</span></div>`;
          if (q.answer) {
            html += `<div class="q-answer">💬 ${esc(q.answer)}<span class="who">${esc(r.author || 'dono do pedido')}</span></div>`;
          } else if (r.mine) {
            html += `<form class="form-answer" data-qid="${esc(q.id)}"><input name="answer" maxlength="300" placeholder="Responder…" required><button type="submit" class="btn btn-sm btn-primary">OK</button></form>`;
          } else {
            html += `<div class="q-pending muted small">aguardando resposta</div>`;
          }
          li.innerHTML = html;
          qList.appendChild(li);
        });
        $$('.form-answer', qList).forEach((f) => f.addEventListener('submit', (e) => {
          e.preventDefault();
          const q = r.questions.find((x) => x.id === f.dataset.qid);
          const a = f.answer.value.trim();
          if (!q || !a) return;
          q.answer = a;
          save(db); paintQuestions();
          toast('Resposta publicada');
        }));
      };
      $$('.qa-suggest .chip', root).forEach((c) => c.addEventListener('click', () => {
        qForm.text.value = c.dataset.q;
        qForm.text.focus();
      }));
      qForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = qForm.text.value.trim();
        if (!text) return;
        r.questions.push({ id: uid(), text, author: db.nick || 'Você', answer: '', at: Date.now() });
        qForm.text.value = '';
        save(db); paintQuestions();
        toast(r.mine ? 'Pergunta registrada' : 'Pergunta enviada. A pessoa responde aqui.');
      });
      paintQuestions();

      // comentários
      const list = $('.comments', root);
      const paintComments = () => {
        list.innerHTML = r.comments.length ? '' : '<li class="muted small">Ainda sem argumentos. Dá o primeiro pitaco!</li>';
        r.comments.slice().reverse().forEach((c) => {
          const li = document.createElement('li');
          li.className = c.side;
          li.innerHTML = `${esc(c.text)}<span class="who">${c.side === 'buy' ? '🛒' : '✋'} ${esc(c.author || 'Anônimo')}</span>`;
          list.appendChild(li);
        });
      };
      $('.form-comment', root).addEventListener('submit', (e) => {
        e.preventDefault();
        const f = e.target;
        const text = f.text.value.trim();
        if (!text) return;
        r.comments.push({ side: f.side.value, text, author: db.nick || 'Você', at: Date.now() });
        f.text.value = '';
        save(db); paintComments();
      });
      paintComments();

      return n;
    },
  };

  // ---------- router ----------
  function route() {
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    const query = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    let view, tab;

    if (parts.length === 0) { view = views.home(); tab = 'home'; }
    else if (parts[0] === 'novo') { view = views.novo(); tab = 'novo'; }
    else if (parts[0] === 'mural') { view = views.mural(); tab = 'mural'; }
    else if (parts[0] === 'meus') { view = views.meus(); tab = 'meus'; }
    else if (parts[0] === 'como-funciona') { view = views.como(); tab = 'como'; }
    else if (parts[0] === 'pedido' && parts[1]) { view = views.pedido(parts[1], query); tab = 'mural'; }
    else { location.hash = '#/'; return; }

    app.innerHTML = '';
    app.appendChild(view);
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();

  // service worker (offline básico)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
