/* HoldWallet · v0.2
 * Dois modos:
 *  - demonstração: tudo em localStorage (sem config.js preenchido)
 *  - online: Supabase (pedidos, votos, perguntas e comentários sincronizados)
 */
(() => {
  'use strict';

  const HOUR = 3600 * 1000;
  const CFG = window.HOLDWALLET_CONFIG || {};
  const NICK_KEY = 'holdwallet.nick';

  // ---------- util ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const isOpen = (r) => !r.decision && r.deadline > Date.now();
  const getNick = () => { try { return localStorage.getItem(NICK_KEY) || ''; } catch (e) { return ''; } };
  const setNick = (n) => { try { localStorage.setItem(NICK_KEY, n || ''); } catch (e) { /* ignore */ } };

  function timeLeft(r) {
    if (r.decision) return r.decision === 'held' ? 'segurou' : 'comprou';
    const ms = r.deadline - Date.now();
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
    toast._t = setTimeout(() => (t.hidden = true), 2400);
  }

  function pct(r) {
    const t = r.votes.buy + r.votes.hold;
    const b = t ? Math.round((r.votes.buy / t) * 100) : 50;
    return { t, b, h: 100 - b };
  }

  // ============================================================
  // Store local (modo demonstração)
  // ============================================================
  class LocalStore {
    constructor() { this.KEY = 'holdwallet.v1'; this.remote = false; }
    async init() {
      try { const raw = localStorage.getItem(this.KEY); if (raw) { this.db = JSON.parse(raw); return; } } catch (e) { /* ignore */ }
      this.db = { requests: this.seed() };
      this.save();
    }
    save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.db)); } catch (e) { /* ignore */ } }
    seed() {
      const now = Date.now();
      const mk = (o) => ({
        id: uid(), createdAt: now - o.ago * HOUR, deadline: now - o.ago * HOUR + 24 * HOUR,
        votes: { buy: o.buy, hold: o.hold }, myVote: null, comments: [], questions: [],
        decision: null, mine: false, scope: 'mural', imageUrl: '', alternative: '', owns: '', ...o,
      });
      return [
        mk({ item: 'iPhone 17 Pro', price: 9499, author: 'Lucas', ago: 3, buy: 4, hold: 23,
          reason: 'Meu 13 ainda funciona mas a bateria tá fraca e quero a câmera nova pra postar.',
          owns: 'iPhone 13, 3 anos de uso, bateria em 78%', alternative: 'Trocar a bateria por R$ 400',
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
          questions: [{ id: 'q4', author: 'Beto', text: 'Você cozinha hoje ou é só a ideia de cozinhar?', answer: 'Cozinho pouco, mas é porque dá preguiça de usar o forno.' }],
          comments: [
            { side: 'buy', author: 'Carla', text: 'Se paga em 2 meses de delivery a menos. Vai.' },
            { side: 'hold', author: 'Beto', text: 'Pega uma de 5L, 12L é exagero pra uma pessoa.' },
          ] }),
        mk({ item: 'Tênis de corrida Pegasus', price: 899, author: 'Thi', ago: 10, buy: 12, hold: 15,
          reason: 'Comecei a correr mês passado, tô usando um tênis de academia velho.',
          owns: 'Tênis de academia de 2 anos, solado gasto', alternative: 'Modelo do ano passado em promoção por R$ 520',
          comments: [{ side: 'buy', author: 'Pri', text: 'Tênis certo evita lesão. Mas compra o do ano passado.' }] }),
        mk({ item: 'Curso de inglês online (anual)', price: 1890, author: 'Jéssica', ago: 20, buy: 27, hold: 8,
          reason: 'Preciso pra entrevista em multinacional. Já tentei app grátis e não evoluo.',
          comments: [{ side: 'buy', author: 'Nando', text: 'Investimento em carreira. Se tem a entrevista, vale.' }] }),
        mk({ item: 'Monitor ultrawide 34"', price: 2299, author: 'Gabriel', ago: 30, buy: 9, hold: 19, decision: 'held',
          reason: 'Trabalho home office, acho que ia render mais com mais tela.', alternative: 'Segundo monitor usado por R$ 500' }),
        mk({ item: 'Cadeira gamer', price: 1299, author: 'Vini', ago: 40, buy: 5, hold: 28, decision: 'held',
          reason: 'Minha cadeira atual rangendo e dói as costas.', alternative: 'Cadeira de escritório ergonômica por R$ 700' }),
      ];
    }
    find(id) { return this.db.requests.find((r) => r.id === id); }
    async listMural(f) {
      let list = this.db.requests.filter((r) => r.scope === 'mural' || r.mine);
      if (f === 'open') list = list.filter(isOpen).sort((a, b) => b.createdAt - a.createdAt);
      if (f === 'hot') list = list.slice().sort((a, b) => (b.votes.buy + b.votes.hold) - (a.votes.buy + a.votes.hold));
      if (f === 'done') list = list.filter((r) => !isOpen(r)).sort((a, b) => b.createdAt - a.createdAt);
      return list;
    }
    async listMine() { return this.db.requests.filter((r) => r.mine).sort((a, b) => b.createdAt - a.createdAt); }
    async get(id, query) {
      let r = this.find(id);
      if (!r && query && query.get('d')) {
        const imp = decodeReq(query.get('d'));
        if (imp && imp.id === id) {
          r = { ...imp, votes: { buy: 0, hold: 0 }, myVote: null, comments: [], questions: [], decision: null, mine: false };
          this.db.requests.unshift(r); this.save();
        }
      }
      return r || null;
    }
    async create(d) {
      const r = { ...d, id: uid(), createdAt: Date.now(), votes: { buy: 0, hold: 0 }, myVote: null, comments: [], questions: [], decision: null, mine: true };
      this.db.requests.unshift(r); this.save();
      return r.id;
    }
    async vote(id, side) {
      const r = this.find(id);
      if (r.myVote === side) return;
      if (r.myVote) r.votes[r.myVote]--;
      r.votes[side]++; r.myVote = side; this.save();
    }
    async decide(id, decision) { const r = this.find(id); r.decision = decision; this.save(); }
    async ask(id, text) { this.find(id).questions.push({ id: uid(), text, author: getNick() || 'Você', answer: '' }); this.save(); }
    async answer(id, qid, text) { const q = this.find(id).questions.find((x) => x.id === qid); if (q) q.answer = text; this.save(); }
    async comment(id, side, text) { this.find(id).comments.push({ id: uid(), side, text, author: getNick() || 'Você' }); this.save(); }
    subscribe() { return () => {}; }
    shareUrl(r) { return `${location.href.split('#')[0]}#/pedido/${r.id}?d=${encodeReq(r)}`; }
  }

  function encodeReq(r) {
    const slim = { id: r.id, item: r.item, price: r.price, reason: r.reason, owns: r.owns, alternative: r.alternative, imageUrl: r.imageUrl, author: r.author, createdAt: r.createdAt, deadline: r.deadline, scope: r.scope };
    return btoa(unescape(encodeURIComponent(JSON.stringify(slim))));
  }
  function decodeReq(s) { try { return JSON.parse(decodeURIComponent(escape(atob(s)))); } catch (e) { return null; } }

  // ============================================================
  // Store remoto (Supabase)
  // ============================================================
  class RemoteStore {
    constructor() {
      this.remote = true;
      this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey);
      this.user = null;
    }
    async init() {
      const { data: { session } } = await this.sb.auth.getSession();
      if (session) { this.user = session.user; return; }
      const { data, error } = await this.sb.auth.signInAnonymously();
      if (error) throw error;
      this.user = data.user;
    }
    get uid() { return this.user && this.user.id; }
    toReq(row, extra = {}) {
      return {
        id: row.id,
        item: row.item,
        price: Number(row.price),
        reason: row.reason,
        owns: row.owns || '',
        alternative: row.alternative || '',
        imageUrl: row.image_url || '',
        author: row.author || 'Anônimo',
        scope: row.scope,
        createdAt: Date.parse(row.created_at),
        deadline: Date.parse(row.deadline),
        decision: row.decision || null,
        votes: { buy: row.buy_votes || 0, hold: row.hold_votes || 0 },
        mine: !!row.owner_id && row.owner_id === this.uid,
        myVote: null, questions: [], comments: [],
        ...extra,
      };
    }
    fail(error) { console.error(error); throw new Error(error.message || 'Erro ao falar com o servidor'); }
    async listMural(f) {
      const now = new Date().toISOString();
      let q = this.sb.from('requests_with_votes').select('*').eq('scope', 'mural');
      if (f === 'open') q = q.is('decision', null).gt('deadline', now).order('created_at', { ascending: false });
      else if (f === 'hot') q = q.order('total_votes', { ascending: false }).order('created_at', { ascending: false });
      else q = q.or(`decision.not.is.null,deadline.lte.${now}`).order('created_at', { ascending: false });
      const { data, error } = await q.limit(60);
      if (error) this.fail(error);
      return data.map((row) => this.toReq(row));
    }
    async listMine() {
      const { data, error } = await this.sb.from('requests_with_votes').select('*').eq('owner_id', this.uid).order('created_at', { ascending: false });
      if (error) this.fail(error);
      return data.map((row) => this.toReq(row));
    }
    async get(id) {
      const { data: rows, error } = await this.sb.rpc('request_by_id', { rid: id });
      if (error) this.fail(error);
      if (!rows || !rows.length) return null;
      const [mine, qs, cs] = await Promise.all([
        this.sb.from('votes').select('side').eq('request_id', id).eq('user_id', this.uid).maybeSingle(),
        this.sb.from('questions').select('*').eq('request_id', id).order('created_at'),
        this.sb.from('comments').select('*').eq('request_id', id).order('created_at'),
      ]);
      return this.toReq(rows[0], {
        myVote: (mine.data && mine.data.side) || null,
        questions: (qs.data || []).map((q) => ({ id: q.id, text: q.text, author: q.author, answer: q.answer || '' })),
        comments: (cs.data || []).map((c) => ({ id: c.id, side: c.side, text: c.text, author: c.author })),
      });
    }
    async create(d) {
      const row = {
        owner_id: this.uid, item: d.item, price: d.price, reason: d.reason, owns: d.owns, alternative: d.alternative,
        image_url: d.imageUrl, author: d.author, scope: d.scope, deadline: new Date(d.deadline).toISOString(),
      };
      const { data, error } = await this.sb.from('requests').insert(row).select('id').single();
      if (error) this.fail(error);
      return data.id;
    }
    async vote(id, side) {
      const { error } = await this.sb.from('votes').upsert({ request_id: id, user_id: this.uid, side }, { onConflict: 'request_id,user_id' });
      if (error) this.fail(error);
    }
    async decide(id, decision) {
      const { error } = await this.sb.from('requests').update({ decision }).eq('id', id);
      if (error) this.fail(error);
    }
    async ask(id, text) {
      const { error } = await this.sb.from('questions').insert({ request_id: id, user_id: this.uid, author: getNick() || 'Anônimo', text });
      if (error) this.fail(error);
    }
    async answer(id, qid, text) {
      const { error } = await this.sb.from('questions').update({ answer: text }).eq('id', qid);
      if (error) this.fail(error);
    }
    async comment(id, side, text) {
      const { error } = await this.sb.from('comments').insert({ request_id: id, user_id: this.uid, author: getNick() || 'Anônimo', side, text });
      if (error) this.fail(error);
    }
    subscribe(id, cb) {
      const ch = this.sb.channel(`pedido-${id}`);
      ['votes', 'questions', 'comments'].forEach((table) =>
        ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `request_id=eq.${id}` }, cb));
      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'requests', filter: `id=eq.${id}` }, cb);
      ch.subscribe();
      return () => this.sb.removeChannel(ch);
    }
    shareUrl(r) { return `${location.href.split('#')[0]}#/pedido/${r.id}`; }
  }

  // ============================================================
  // UI
  // ============================================================
  const app = $('#app');
  const tpl = (id) => document.importNode($(`#${id}`).content, true);
  let store;

  function shareText(r) {
    const owns = r.owns ? `\nJá tenho: ${r.owns}` : '';
    return `🦸 HoldWallet\n\nTô querendo comprar: *${r.item}* por *${brl(r.price)}*.\nMotivo: ${r.reason}${owns}\n\nCompro ou seguro? Vota aí 👇\n${store.shareUrl(r)}`;
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
    if (!list.length) { container.innerHTML = `<div class="empty">${emptyMsg}</div>`; return; }
    list.forEach((r) => container.appendChild(cardEl(r)));
  }

  function statsOf(mine) {
    const held = mine.filter((r) => r.decision === 'held');
    return {
      saved: held.reduce((s, r) => s + Number(r.price), 0),
      held: held.length,
      bought: mine.filter((r) => r.decision === 'bought').length,
      open: mine.filter(isOpen).length,
      votes: mine.reduce((s, r) => s + r.votes.buy + r.votes.hold, 0),
    };
  }
  function fillStats(root, s) {
    $$('[data-stat]', root).forEach((el) => { el.textContent = el.dataset.stat === 'saved' ? brl(s.saved) : s[el.dataset.stat]; });
  }

  // ---------- views ----------
  const views = {
    async home() {
      const n = tpl('tpl-home');
      const [mine, open] = await Promise.all([store.listMine(), store.listMural('open')]);
      fillStats(n, statsOf(mine));
      renderList($('#home-feed', n), open.slice(0, 3), 'Nada no mural ainda. Seja o primeiro!');
      return n;
    },

    async novo() {
      const n = tpl('tpl-novo');
      const form = $('#form-novo', n);
      form.author.value = getNick();
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = $('button[type=submit]', form);
        btn.disabled = true;
        try {
          const f = new FormData(form);
          const author = (f.get('author') || '').trim() || 'Anônimo';
          setNick(author === 'Anônimo' ? '' : author);
          const id = await store.create({
            item: f.get('item').trim(),
            price: Number(f.get('price')),
            reason: f.get('reason').trim(),
            owns: (f.get('owns') || '').trim(),
            alternative: (f.get('alternative') || '').trim(),
            imageUrl: (f.get('imageUrl') || '').trim(),
            author,
            scope: f.get('scope'),
            deadline: Date.now() + Number(f.get('hours')) * HOUR,
          });
          toast('Votação aberta! Agora manda pra galera.');
          location.hash = `#/pedido/${id}`;
        } catch (err) {
          toast('Não deu: ' + err.message);
          btn.disabled = false;
        }
      });
      return n;
    },

    async mural() {
      const n = tpl('tpl-mural');
      const feed = $('#mural-feed', n);
      const filters = $('#mural-filters', n);
      const apply = async (f) => {
        feed.innerHTML = '<div class="loading">carregando…</div>';
        try { renderList(feed, await store.listMural(f), 'Nada por aqui.'); }
        catch (err) { feed.innerHTML = `<div class="empty">${esc(err.message)}</div>`; }
      };
      filters.addEventListener('click', (e) => {
        const b = e.target.closest('.chip');
        if (!b) return;
        $$('.chip', filters).forEach((c) => c.classList.toggle('active', c === b));
        apply(b.dataset.f);
      });
      await apply('open');
      return n;
    },

    async meus() {
      const n = tpl('tpl-meus');
      const mine = await store.listMine();
      fillStats(n, statsOf(mine));
      renderList($('#meus-feed', n), mine, 'Você ainda não pediu opinião. <br><a href="#/novo" class="link">Criar o primeiro pedido →</a>');
      return n;
    },

    async como() {
      const n = tpl('tpl-como');
      $('.mode-note', n).textContent = store.remote
        ? 'HoldWallet · v0.2 · online: votos, perguntas e comentários sincronizados entre aparelhos.'
        : 'HoldWallet · v0.2 · modo demonstração: os dados ficam salvos só neste aparelho.';
      return n;
    },

    async pedido(id, query) {
      let r = await store.get(id, query);
      if (!r) {
        const d = document.createElement('section');
        d.className = 'section';
        d.innerHTML = '<div class="empty">Pedido não encontrado.<br><a href="#/mural" class="link">Ir pro mural →</a></div>';
        return d;
      }

      const n = tpl('tpl-detalhe');
      const root = $('.detail', n);
      const busy = (fn) => async (...a) => { try { await fn(...a); } catch (err) { toast('Não deu: ' + err.message); } };
      const reload = async () => { const fresh = await store.get(id); if (fresh) { r = fresh; paintAll(); } };

      // cabeçalho (não muda)
      $('.detail-price', root).textContent = brl(r.price);
      $('.detail-item', root).textContent = r.item;
      $('.detail-author', root).textContent = `por ${r.author || 'Anônimo'} · ${r.scope === 'mural' ? 'mural público' : 'só com link'}`;
      $('.detail-reason', root).textContent = r.reason;
      if (r.owns) $('.detail-owns-text', root).textContent = r.owns;
      else {
        $('.detail-owns', root).classList.add('is-empty');
        $('.detail-owns-text', root).innerHTML = r.mine
          ? '<span class="muted">Você não contou o que já tem. Se alguém perguntar, responda abaixo.</span>'
          : '<span class="muted">A pessoa não contou o que já tem. Pergunte antes de votar 👇</span>';
      }
      if (r.alternative) { $('.detail-alt', root).hidden = false; $('.detail-alternative', root).textContent = r.alternative; }
      if (r.imageUrl && /^https?:\/\//i.test(r.imageUrl) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(r.imageUrl)) {
        const box = $('.detail-img', root); box.hidden = false; $('img', box).src = r.imageUrl;
      }

      // votos
      const paintVotes = () => {
        const p = pct(r); const closed = !isOpen(r);
        $('.detail-time', root).textContent = timeLeft(r);
        $('.bar-buy', root).style.width = p.b + '%';
        $('.bar-hold', root).style.width = p.h + '%';
        $('.c-buy', root).textContent = `🛒 Compra ${p.b}% (${r.votes.buy})`;
        $('.c-hold', root).textContent = `✋ Segura ${p.h}% (${r.votes.hold})`;
        $$('[data-vote]', root).forEach((b) => { b.classList.toggle('chosen', r.myVote === b.dataset.vote); b.disabled = closed; });
        $('.vote-note', root).textContent = closed ? 'Votação encerrada.'
          : r.myVote ? 'Seu voto foi registrado. Toque de novo para mudar.'
          : r.mine ? 'Você também pode votar no seu próprio pedido, mas sem trapaça, hein?'
          : 'Seu voto é anônimo e não compra nada.';
      };
      $$('[data-vote]', root).forEach((b) => b.addEventListener('click', busy(async () => {
        const v = b.dataset.vote;
        if (r.myVote === v) return;
        await store.vote(id, v);
        if (r.myVote) r.votes[r.myVote]--;
        r.votes[v]++; r.myVote = v;
        paintVotes();
        toast(v === 'buy' ? 'Votou: Compra! 🛒' : 'Votou: Segura! ✋');
      })));

      // compartilhar
      $('[data-action="whatsapp"]', root).addEventListener('click', () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText(r))}`, '_blank');
      });
      $('[data-action="copy"]', root).addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(store.shareUrl(r)); toast('Link copiado!'); }
        catch (e) { prompt('Copie o link:', store.shareUrl(r)); }
      });

      // decisão (só do dono)
      const decideBox = $('.decide-box', root);
      const banner = $('.decided-banner', root);
      const paintDecision = () => {
        decideBox.hidden = !(r.mine && !r.decision);
        banner.hidden = !r.decision;
        if (r.decision) {
          banner.className = `decided-banner ${r.decision}`;
          banner.textContent = r.decision === 'held'
            ? (r.mine ? `✋ Você segurou ${brl(r.price)}. Boa!` : `✋ ${r.author} segurou ${brl(r.price)}.`)
            : (r.mine ? '🛒 Você comprou. Que seja bem usado!' : `🛒 ${r.author} decidiu comprar.`);
        }
      };
      $$('[data-decide]', root).forEach((b) => b.addEventListener('click', busy(async () => {
        await store.decide(id, b.dataset.decide);
        r.decision = b.dataset.decide;
        paintDecision(); paintVotes();
        toast(r.decision === 'held' ? 'Economia registrada 💚' : 'Decisão registrada');
      })));

      // perguntas antes de votar
      const qList = $('.questions', root);
      const qForm = $('.form-question', root);
      const paintQuestions = () => {
        qList.innerHTML = r.questions.length ? '' : '<li class="muted small q-empty">Ninguém perguntou nada ainda.</li>';
        r.questions.forEach((q) => {
          const li = document.createElement('li');
          li.className = 'q' + (q.answer ? ' answered' : '');
          let html = `<div class="q-text">❓ ${esc(q.text)}<span class="who">${esc(q.author || 'Anônimo')}</span></div>`;
          if (q.answer) html += `<div class="q-answer">💬 ${esc(q.answer)}<span class="who">${esc(r.author || 'dono do pedido')}</span></div>`;
          else if (r.mine) html += `<form class="form-answer" data-qid="${esc(q.id)}"><input name="answer" maxlength="300" placeholder="Responder…" required><button type="submit" class="btn btn-sm btn-primary">OK</button></form>`;
          else html += '<div class="q-pending muted small">aguardando resposta</div>';
          li.innerHTML = html;
          qList.appendChild(li);
        });
        $$('.form-answer', qList).forEach((f) => f.addEventListener('submit', busy(async (e) => {
          e.preventDefault();
          const a = f.answer.value.trim();
          if (!a) return;
          await store.answer(id, f.dataset.qid, a);
          const q = r.questions.find((x) => x.id === f.dataset.qid);
          if (q) q.answer = a;
          paintQuestions();
          toast('Resposta publicada');
        })));
      };
      $$('.qa-suggest .chip', root).forEach((c) => c.addEventListener('click', () => { qForm.text.value = c.dataset.q; qForm.text.focus(); }));
      qForm.addEventListener('submit', busy(async (e) => {
        e.preventDefault();
        const text = qForm.text.value.trim();
        if (!text) return;
        await store.ask(id, text);
        qForm.text.value = '';
        if (store.remote) await reload();
        else { r = await store.get(id); paintQuestions(); }
        toast(r.mine ? 'Pergunta registrada' : 'Pergunta enviada. A pessoa responde aqui.');
      }));

      // argumentos
      const cList = $('.comments', root);
      const paintComments = () => {
        cList.innerHTML = r.comments.length ? '' : '<li class="muted small">Ainda sem argumentos. Dá o primeiro pitaco!</li>';
        r.comments.slice().reverse().forEach((c) => {
          const li = document.createElement('li');
          li.className = c.side;
          li.innerHTML = `${esc(c.text)}<span class="who">${c.side === 'buy' ? '🛒' : '✋'} ${esc(c.author || 'Anônimo')}</span>`;
          cList.appendChild(li);
        });
      };
      $('.form-comment', root).addEventListener('submit', busy(async (e) => {
        e.preventDefault();
        const f = e.target;
        const text = f.text.value.trim();
        if (!text) return;
        await store.comment(id, f.side.value, text);
        f.text.value = '';
        if (store.remote) await reload();
        else { r = await store.get(id); paintComments(); }
      }));

      const paintAll = () => { paintVotes(); paintDecision(); paintQuestions(); paintComments(); };
      paintAll();

      // tempo real: qualquer mudança no pedido recarrega as partes dinâmicas
      const unsubscribe = store.subscribe(id, () => reload().catch(() => {}));
      root.addEventListener('hw:leave', unsubscribe, { once: true });
      return n;
    },
  };

  // ---------- router ----------
  let routeSeq = 0;
  async function route() {
    const seq = ++routeSeq;
    const hash = location.hash || '#/';
    const [path, qs] = hash.slice(1).split('?');
    const query = new URLSearchParams(qs || '');
    const parts = path.split('/').filter(Boolean);
    let viewFn, tab;

    if (parts.length === 0) { viewFn = () => views.home(); tab = 'home'; }
    else if (parts[0] === 'novo') { viewFn = () => views.novo(); tab = 'novo'; }
    else if (parts[0] === 'mural') { viewFn = () => views.mural(); tab = 'mural'; }
    else if (parts[0] === 'meus') { viewFn = () => views.meus(); tab = 'meus'; }
    else if (parts[0] === 'como-funciona') { viewFn = () => views.como(); tab = 'como'; }
    else if (parts[0] === 'pedido' && parts[1]) { viewFn = () => views.pedido(parts[1], query); tab = 'mural'; }
    else { location.hash = '#/'; return; }

    // avisa a tela anterior (cancela assinaturas de tempo real)
    $$('.detail', app).forEach((el) => el.dispatchEvent(new Event('hw:leave')));
    app.innerHTML = '<div class="loading">carregando…</div>';
    try {
      const view = await viewFn();
      if (seq !== routeSeq) return; // o usuário já navegou para outra tela
      app.innerHTML = '';
      app.appendChild(view);
    } catch (err) {
      console.error(err);
      app.innerHTML = `<section class="section"><div class="empty">Não consegui carregar.<br><span class="small">${esc(err.message)}</span></div></section>`;
    }
    $$('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    window.scrollTo(0, 0);
  }

  // ---------- boot ----------
  async function boot() {
    const wantRemote = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);
    if (wantRemote && !window.supabase) {
      app.innerHTML = '<section class="section"><div class="empty">Não consegui carregar a biblioteca do Supabase. Verifique a conexão.</div></section>';
      return;
    }
    store = wantRemote ? new RemoteStore() : new LocalStore();
    try {
      await store.init();
    } catch (err) {
      console.error(err);
      if (wantRemote) {
        toast('Sem conexão com o servidor. Usando o modo demonstração.');
        store = new LocalStore();
        await store.init();
      }
    }
    $('#mode-banner').hidden = store.remote;
    window.addEventListener('hashchange', route);
    await route();
  }
  boot();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
