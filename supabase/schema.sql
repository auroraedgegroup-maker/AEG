create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  business_name text not null,
  email text not null,
  email_normalized text generated always as (lower(email)) stored,
  phone text,
  website text,
  city text,
  niche text,
  pain_point text,
  source text not null default 'website',
  offer_interest text,
  lead_status text not null default 'new',
  outreach_status text not null default 'draft',
  outreach_step integer not null default 0,
  channel_preference text not null default 'email',
  next_action_at timestamptz,
  last_contacted_at timestamptz,
  tags text[] not null default '{}'::text[],
  notes text
);

create unique index if not exists leads_email_normalized_idx on public.leads (email_normalized);
create index if not exists leads_next_action_idx on public.leads (next_action_at);
create index if not exists leads_status_idx on public.leads (lead_status, outreach_status);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete set null,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  offer_id text not null,
  offer_name text not null,
  amount_cents integer not null,
  currency text not null default 'usd',
  status text not null default 'pending',
  client_name text not null,
  client_email text not null,
  intake_token text not null default encode(gen_random_bytes(12), 'hex'),
  success_url text,
  cancel_url text
);

create index if not exists orders_lead_idx on public.orders (lead_id);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.intake_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  website text,
  primary_offer text,
  service_area text,
  crm text,
  sales_follow_up text,
  goals text,
  notes text
);

create table if not exists public.deliverables (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  status text not null default 'queued',
  generated_at timestamptz,
  delivered_at timestamptz,
  delivery_markdown text,
  delivery_json jsonb not null default '{}'::jsonb
);

create index if not exists deliverables_status_idx on public.deliverables (status);

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  source text not null,
  source_doc_id text not null,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists knowledge_documents_source_doc_idx
  on public.knowledge_documents (source, source_doc_id);

create table if not exists public.lead_activity (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id uuid references public.leads(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  event_type text not null,
  channel text,
  subject text,
  message text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists lead_activity_lead_idx on public.lead_activity (lead_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_leads on public.leads;
create trigger set_updated_at_leads
before update on public.leads
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_orders on public.orders;
create trigger set_updated_at_orders
before update on public.orders
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_intake_responses on public.intake_responses;
create trigger set_updated_at_intake_responses
before update on public.intake_responses
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_deliverables on public.deliverables;
create trigger set_updated_at_deliverables
before update on public.deliverables
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_knowledge_documents on public.knowledge_documents;
create trigger set_updated_at_knowledge_documents
before update on public.knowledge_documents
for each row execute procedure public.set_updated_at();
