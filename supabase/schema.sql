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
  outreach_retry_count integer not null default 0,
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
  delivery_status text not null default 'queued',
  delivery_error text,
  delivery_provider_id text,
  fulfilled_at timestamptz,
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
  delivery_json jsonb not null default '{}'::jsonb,
  last_error text
);

create index if not exists deliverables_status_idx on public.deliverables (status);
create index if not exists orders_delivery_status_idx on public.orders (delivery_status);

alter table public.leads
  add column if not exists outreach_retry_count integer not null default 0;

alter table public.orders
  add column if not exists delivery_status text not null default 'queued';

alter table public.orders
  add column if not exists delivery_error text;

alter table public.orders
  add column if not exists delivery_provider_id text;

alter table public.orders
  add column if not exists fulfilled_at timestamptz;

alter table public.deliverables
  add column if not exists last_error text;

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

create table if not exists public.outreach_campaigns (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  channel text not null default 'email',
  sender_email text,
  description text,
  status text not null default 'draft'
);

create table if not exists public.outreach_email_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  name text not null,
  subject text not null,
  body text not null,
  is_active boolean not null default true
);

create index if not exists outreach_email_templates_campaign_idx
  on public.outreach_email_templates (campaign_id, is_active);

create table if not exists public.outreach_sms_templates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  name text not null,
  body text not null,
  is_active boolean not null default true
);

create index if not exists outreach_sms_templates_campaign_idx
  on public.outreach_sms_templates (campaign_id, is_active);

create table if not exists public.outreach_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  name text not null,
  business_name text not null,
  email text,
  phone text,
  website text,
  city text,
  notes text,
  status text not null default 'draft',
  ready_to_send_at timestamptz,
  skipped_at timestamptz,
  sent_at timestamptz,
  replied_at timestamptz,
  positive_reply_at timestamptz,
  booked_call_at timestamptz,
  last_message_subject text,
  last_message_body text
);

create index if not exists outreach_prospects_campaign_idx
  on public.outreach_prospects (campaign_id, status);

create unique index if not exists outreach_prospects_campaign_email_idx
  on public.outreach_prospects (campaign_id, lower(email))
  where email is not null and email <> '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_campaigns_status_check'
  ) then
    alter table public.outreach_campaigns
      add constraint outreach_campaigns_status_check
      check (status in ('draft', 'active', 'paused', 'completed'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_campaigns_channel_check'
  ) then
    alter table public.outreach_campaigns
      add constraint outreach_campaigns_channel_check
      check (channel in ('email', 'sms', 'mixed'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_prospects_status_check'
  ) then
    alter table public.outreach_prospects
      add constraint outreach_prospects_status_check
      check (status in ('draft', 'ready_to_send', 'sent', 'skipped', 'replied', 'booked', 'won', 'lost'));
  end if;
end
$$;

alter table public.outreach_prospects
  add column if not exists ready_to_send_at timestamptz;

alter table public.outreach_prospects
  add column if not exists skipped_at timestamptz;

alter table public.outreach_prospects
  add column if not exists positive_reply_at timestamptz;

alter table public.outreach_prospects
  add column if not exists last_message_subject text;

alter table public.outreach_prospects
  add column if not exists last_message_body text;

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'outreach_prospects_status_check'
      and conrelid = 'public.outreach_prospects'::regclass
  ) then
    alter table public.outreach_prospects
      drop constraint outreach_prospects_status_check;
  end if;
end
$$;

alter table public.outreach_prospects
  add constraint outreach_prospects_status_check
  check (status in ('draft', 'ready_to_send', 'sent', 'skipped', 'replied', 'booked', 'won', 'lost'));

create table if not exists public.outreach_activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  prospect_id uuid not null references public.outreach_prospects(id) on delete cascade,
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  event_type text not null,
  message_subject text,
  message_body text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists outreach_activity_log_campaign_idx
  on public.outreach_activity_log (campaign_id, created_at desc);

create index if not exists outreach_activity_log_prospect_idx
  on public.outreach_activity_log (prospect_id, created_at desc);

create table if not exists public.outreach_followups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  prospect_id uuid not null references public.outreach_prospects(id) on delete cascade,
  campaign_id uuid not null references public.outreach_campaigns(id) on delete cascade,
  followup_step integer not null default 1,
  scheduled_for timestamptz not null,
  status text not null default 'scheduled',
  message_subject text,
  message_body text,
  notes text,
  prepared_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists outreach_followups_schedule_idx
  on public.outreach_followups (campaign_id, status, scheduled_for);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'outreach_followups_status_check'
  ) then
    alter table public.outreach_followups
      add constraint outreach_followups_status_check
      check (status in ('scheduled', 'ready_to_send', 'sent', 'skipped', 'canceled'));
  end if;
end
$$;

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

drop trigger if exists set_updated_at_outreach_campaigns on public.outreach_campaigns;
create trigger set_updated_at_outreach_campaigns
before update on public.outreach_campaigns
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_outreach_email_templates on public.outreach_email_templates;
create trigger set_updated_at_outreach_email_templates
before update on public.outreach_email_templates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_outreach_sms_templates on public.outreach_sms_templates;
create trigger set_updated_at_outreach_sms_templates
before update on public.outreach_sms_templates
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_outreach_prospects on public.outreach_prospects;
create trigger set_updated_at_outreach_prospects
before update on public.outreach_prospects
for each row execute procedure public.set_updated_at();

drop trigger if exists set_updated_at_outreach_followups on public.outreach_followups;
create trigger set_updated_at_outreach_followups
before update on public.outreach_followups
for each row execute procedure public.set_updated_at();
