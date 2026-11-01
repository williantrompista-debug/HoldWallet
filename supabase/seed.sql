-- ============================================================
-- HoldWallet · dados de exemplo (opcional)
-- Rode DEPOIS do schema.sql para o mural não nascer vazio.
-- Os pedidos de exemplo não têm dono, então ninguém decide por eles.
-- ============================================================

with r1 as (
  insert into public.requests (item, price, reason, owns, alternative, author, deadline)
  values ('iPhone 17 Pro', 9499, 'Meu 13 ainda funciona mas a bateria tá fraca e quero a câmera nova pra postar.',
          'iPhone 13, 3 anos de uso, bateria em 78%', 'Trocar a bateria por R$ 400', 'Lucas', now() + interval '21 hours')
  returning id
)
insert into public.questions (request_id, author, text, answer)
select id, 'Ana', 'Você trabalha com foto ou é só pra postar no Instagram?', 'Só pra postar mesmo, não é trabalho.' from r1
union all select id, 'Rafa', 'Vai pagar à vista ou parcelado?', '12x no cartão.' from r1
union all select id, 'Bia', 'Já pensou num 15 ou 16 seminovo?', '' from r1;

insert into public.comments (request_id, author, side, text)
select id, 'Ana', 'hold', 'Troca a bateria e segura mais 1 ano. Câmera do 13 ainda é ótima.' from public.requests where item = 'iPhone 17 Pro'
union all select id, 'Rafa', 'hold', 'R$ 9.500 é quase um ano de academia + viagem. Segura.' from public.requests where item = 'iPhone 17 Pro'
union all select id, 'Dudu', 'buy', 'Se trabalha com conteúdo, é ferramenta. Compra.' from public.requests where item = 'iPhone 17 Pro';

with r2 as (
  insert into public.requests (item, price, reason, owns, author, deadline)
  values ('Air fryer 12L', 549, 'Moro sozinha, peço delivery 4x por semana. Acho que ia cozinhar mais.',
          'Só fogão e micro-ondas. Nunca tive air fryer.', 'Mari', now() + interval '19 hours')
  returning id
)
insert into public.questions (request_id, author, text, answer)
select id, 'Beto', 'Você cozinha hoje ou é só a ideia de cozinhar?', 'Cozinho pouco, mas é porque dá preguiça de usar o forno.' from r2;

insert into public.comments (request_id, author, side, text)
select id, 'Carla', 'buy', 'Se paga em 2 meses de delivery a menos. Vai.' from public.requests where item = 'Air fryer 12L'
union all select id, 'Beto', 'hold', 'Pega uma de 5L, 12L é exagero pra uma pessoa.' from public.requests where item = 'Air fryer 12L';

insert into public.requests (item, price, reason, owns, alternative, author, deadline)
values ('Tênis de corrida Pegasus', 899, 'Comecei a correr mês passado, tô usando um tênis de academia velho.',
        'Tênis de academia de 2 anos, solado gasto', 'Modelo do ano passado em promoção por R$ 520', 'Thi', now() + interval '14 hours');

insert into public.requests (item, price, reason, author, deadline)
values ('Curso de inglês online (anual)', 1890, 'Preciso pra entrevista em multinacional. Já tentei app grátis e não evoluo.',
        'Jéssica', now() + interval '4 hours');

insert into public.requests (item, price, reason, alternative, author, deadline, decision, created_at)
values ('Monitor ultrawide 34"', 2299, 'Trabalho home office, acho que ia render mais com mais tela.',
        'Segundo monitor usado por R$ 500', 'Gabriel', now() - interval '6 hours', 'held', now() - interval '30 hours');

insert into public.requests (item, price, reason, alternative, author, deadline, decision, created_at)
values ('Cadeira gamer', 1299, 'Minha cadeira atual rangendo e dói as costas.',
        'Cadeira de escritório ergonômica por R$ 700', 'Vini', now() - interval '16 hours', 'held', now() - interval '40 hours');
