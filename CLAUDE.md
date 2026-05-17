# Inscrições Sião 2025 — Orquestrador de Projeto

## Visão Geral

Sistema de inscrições para o **Sião 2025**, evento da Igreja Batista Sião em Maringá, PR.
Datas do evento: **25, 26 e 27 de junho de 2025** · Qui/Sex: 20h–22h · Sáb: 16h–21h

**Stack:** Next.js 14 · Prisma 5 · Supabase (PostgreSQL + Storage) · Stripe · Vercel

---

## Mapa de Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `app/page.tsx` | Página principal: hero + formulário de inscrição individual |
| `app/caravana/page.tsx` | Página oculta `/caravana` — inscrição de grupos/caravanas |
| `app/admin/page.tsx` | Painel de check-in `/admin` — caravanas e individuais |
| `app/sucesso/page.tsx` | Página pós-pagamento (Stripe redireciona aqui) |
| `app/api/create-checkout/route.ts` | Cria sessão Stripe + salva `Registration` como `pending` |
| `app/api/webhook/route.ts` | Recebe eventos Stripe; confirma/expira inscrições |
| `app/api/caravana/route.ts` | POST salva caravana + upload PDF; GET lista todas |
| `app/api/checkin/route.ts` | PATCH toggle check-in; GET retorna dados do painel |
| `lib/pricing.ts` | Toda a lógica de lotes, preços e validação de CEP |
| `lib/prisma.ts` | Singleton do cliente Prisma |
| `lib/stripe.ts` | Singleton do cliente Stripe |
| `lib/supabase.ts` | Cliente Supabase admin (service role) |
| `prisma/schema.prisma` | Schema: models `Registration` e `Caravan` |

---

## Lógica de Preços (lib/pricing.ts)

CEPs de Maringá: `87000000` a `87139999` — verificado por `isCepMaringa()`.

| Condição | Tier | Valor |
|---|---|---|
| CEP fora de Maringá | `outside` | R$ 40 |
| Maringá, não-membro | `local` | R$ 60 |
| Maringá, membro, < 50 confirmados, antes de 14/06 | `member_1st` | R$ 60 |
| Maringá, membro, ≥ 50 confirmados | `member_2nd` | R$ 70 |
| Maringá, membro, após 14/06/2025 | `member_final` | R$ 80 |

Inscrições encerram em **21/06/2025 23:59 BRT**.
"Ser membro" é validado por checkbox de honestidade, sem verificação técnica.

O `memberCount` (contagem para o lote) é buscado em `create-checkout` via:
```ts
prisma.registration.count({ where: { isMember: true, status: 'confirmed', priceTier: 'member_1st' } })
```

---

## Schema do Banco (Prisma/Supabase PostgreSQL)

### `registrations`
- `id` UUID PK
- `name`, `email`, `phone`, `cpf` — dados pessoais
- `source` — como ficou sabendo (opcional)
- `cep`, `city` — endereço
- `isMember` Boolean
- `priceTier` — `outside | local | member_1st | member_2nd | member_final`
- `amount` Int (centavos)
- `status` — `pending | confirmed | expired`
- `stripeSessionId`, `paidAt` — preenchidos pelo webhook
- `checkedIn` Boolean, `checkedInAt` DateTime — preenchidos pelo painel admin
- `createdAt`

### `caravans`
- `id` UUID PK
- `city`, `church` — origem
- `leader`, `leaderPhone` — responsável
- `peopleCount` Int
- `listFileUrl`, `listFileName` — PDF no Supabase Storage (bucket `event-files`)
- `status` — padrão `confirmed`
- `checkedIn` Boolean, `checkedInAt` DateTime
- `createdAt`

---

## Variáveis de Ambiente (.env / Vercel)

```
DATABASE_URL          # Supabase connection pooler (pgBouncer)
DIRECT_URL            # Supabase direct connection (para migrations)
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_OUTSIDE       # Price ID do produto R$40
STRIPE_PRICE_LOCAL         # Price ID do produto R$60
STRIPE_PRICE_MEMBER_2ND    # Price ID do produto R$70
STRIPE_PRICE_MEMBER_FINAL  # Price ID do produto R$80
STRIPE_WEBHOOK_SECRET      # Gerado ao registrar o webhook no Stripe Dashboard
NEXT_PUBLIC_APP_URL        # URL do deploy (ex: https://inscricoes.siao.com.br)
```

---

## Fluxo de Inscrição Individual

1. Usuário preenche formulário em `/` com nome, email, telefone, CPF, CEP, source
2. Frontend consulta ViaCEP para validar CEP e detectar se é Maringá
3. `POST /api/create-checkout` calcula o tier, salva `Registration{status:'pending'}`, cria sessão Stripe
4. Usuário paga no Stripe Checkout
5. Stripe envia `checkout.session.completed` para `POST /api/webhook`
6. Webhook atualiza `Registration{status:'confirmed', paidAt, stripeSessionId}`
7. Stripe redireciona para `/sucesso?session_id=...`

---

## Fluxo de Caravana

1. Líder acessa `/caravana` (URL não divulgada publicamente)
2. Preenche cidade, igreja, nome do líder, telefone, nº de pessoas e faz upload do PDF da lista
3. `POST /api/caravana` faz upload do PDF para `event-files/caravanas/` no Supabase Storage e salva `Caravan`
4. Caravana aparece no painel `/admin`

---

## Painel Admin (/admin)

- Sem autenticação (URL não divulgada)
- Exibe estatísticas: total de caravanas, pessoas em caravana, individuais, total geral
- Aba **Caravanas**: lista com check-in por caravana, contagem de pessoas, botão para ver PDF
- Aba **Individuais**: lista apenas inscrições `status:'confirmed'`, com toggle de check-in
- Busca por nome, cidade, CPF, email, igreja
- `PATCH /api/checkin` faz toggle de `checkedIn`/`checkedInAt`

---

## Pendências para Produção

1. **Supabase Storage** — criar bucket `event-files` como **Public** no dashboard do Supabase
2. **Migrations** — rodar `npx prisma migrate dev --name add-caravans-checkin` para criar tabela `caravans` e adicionar `checkedIn`/`checkedInAt` em `registrations`
3. **Stripe Webhook** — registrar endpoint `https://<dominio>/api/webhook` no Stripe Dashboard (eventos: `checkout.session.completed`, `checkout.session.expired`) e copiar o `STRIPE_WEBHOOK_SECRET` para a Vercel
4. **Vercel** — preencher `NEXT_PUBLIC_APP_URL` com a URL de produção

---

## Convenções e Notas Técnicas

- Todos os valores monetários em **centavos** (Int) no banco e na lógica de preços
- O build de produção roda `prisma generate && prisma migrate deploy && next build` (ver `package.json`)
- Supabase usa dois URLs: `DATABASE_URL` (pooler para runtime) e `DIRECT_URL` (direto para migrations)
- A sessão Stripe inclui `metadata.registration_id` para o webhook correlacionar
- O painel admin não tem paginação — adequado para o volume do evento
- `app/caravana/page.tsx` e `app/admin/page.tsx` são páginas ocultas (sem link na navegação principal)
