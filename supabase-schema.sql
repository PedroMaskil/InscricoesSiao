-- ============================================================
-- Execute este SQL no Supabase Dashboard
-- SQL Editor → New Query → Cole e clique em Run
-- ============================================================

create table if not exists registrations (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  email             text not null,
  phone             text not null,
  cpf               text not null,
  source            text,
  is_member         boolean not null default false,
  status            text not null default 'pending',
  -- status: 'pending' | 'confirmed' | 'expired'
  stripe_session_id text,
  paid_at           timestamptz,
  created_at        timestamptz default now()
);

-- Índices úteis
create index if not exists registrations_email_idx  on registrations(email);
create index if not exists registrations_status_idx on registrations(status);

-- Row Level Security: bloqueia acesso direto pelo browser
-- (apenas a service role key server-side pode escrever)
alter table registrations enable row level security;

-- Política: nenhum acesso público (só via API com service role)
create policy "No public access"
  on registrations for all
  using (false);
