# Event Registration — Setup Completo

Stack: **Next.js 14 · Supabase · Stripe · Vercel**

---

## 1. Clonar e instalar

```bash
git clone <seu-repo>
cd event-registration
npm install
```

---

## 2. Supabase

1. Crie um projeto em https://supabase.com
2. Vá em **SQL Editor → New Query**
3. Cole o conteúdo de `supabase-schema.sql` e clique em **Run**
4. Copie as credenciais em **Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Stripe

1. Crie uma conta em https://stripe.com
2. **Products → Add Product**
   - Produto 1: "Ingresso Membro" — R$ 97,00 (one-time)
   - Produto 2: "Ingresso Geral" — R$ 197,00 (one-time)
   - Copie os IDs de preço (`price_xxx`) para o `.env`
3. **Developers → API Keys** → copie as chaves
4. **Developers → Webhooks → Add endpoint**
   - URL: `https://SEU-DOMINIO.vercel.app/api/webhook`
   - Events: `checkout.session.completed`, `checkout.session.expired`
   - Copie o **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

> 💡 **Pix:** No dashboard do Stripe, ative "Pix" em Payment Methods.
> No `create-checkout/route.ts`, adicione `'pix'` em `payment_method_types`.

---

## 4. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

```bash
cp .env.example .env.local
```

---

## 5. Rodar localmente

```bash
npm run dev
# → http://localhost:3000
```

Para testar webhooks localmente, use o Stripe CLI:

```bash
stripe listen --forward-to localhost:3000/api/webhook
```

---

## 6. Deploy na Vercel

```bash
npm install -g vercel
vercel
```

Ou conecte o repositório no https://vercel.com e configure as
variáveis de ambiente em **Settings → Environment Variables**.

---

## Arquitetura do fluxo

```
Usuário preenche form
       ↓
POST /api/create-checkout
  → Salva inscrição no Supabase (status: pending)
  → Cria sessão no Stripe
       ↓
Redireciona para Stripe Checkout
       ↓
Pagamento aprovado
       ↓
Stripe chama POST /api/webhook
  → Atualiza inscrição (status: confirmed)
       ↓
Redireciona para /sucesso
```

---

## Personalizar preços

Em `app/page.tsx`, altere:

```ts
const PRICE_MEMBER  = 97   // ← valor exibido (apenas visual)
const PRICE_GENERAL = 197  // ← valor exibido (apenas visual)
```

Os valores reais cobrados são os definidos no **painel do Stripe** via
`STRIPE_PRICE_MEMBER` e `STRIPE_PRICE_GENERAL`.
