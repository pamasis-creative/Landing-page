-- PAMASIS customer conversations v1
-- Private lead and support data is accessed only through the pamasis-chat Edge Function.
create extension if not exists pgcrypto;
create table if not exists public.pamasis_chat_staff (
 user_id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 email text not null,
 role text not null default 'agent' check (role in ('owner','admin','manager','agent')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.pamasis_leads (
 id uuid primary key default gen_random_uuid(),
 full_name text not null,
 business_name text not null,
 phone text not null,
 email text not null,
 business_type text,
 city text,
 state text,
 interests text[] not null default '{}',
 palm_oil_usage text,
 source text not null default 'website',
 created_at timestamptz not null default now()
);
create table if not exists public.pamasis_chat_conversations (
 id uuid primary key default gen_random_uuid(),
 lead_id uuid references public.pamasis_leads(id) on delete set null,
 visitor_token_hash text not null,
 status text not null default 'new' check (status in ('new','open','waiting','resolved','closed')),
 assigned_to uuid references public.pamasis_chat_staff(user_id) on delete set null,
 assigned_by uuid references public.pamasis_chat_staff(user_id) on delete set null,
 source text not null default 'website',
 subject text,
 last_message_at timestamptz not null default now(),
 last_staff_reply_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.pamasis_chat_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.pamasis_chat_conversations(id) on delete cascade,
 sender_type text not null check (sender_type in ('visitor','staff','system')),
 sender_id uuid,
 body text not null check (char_length(body) between 1 and 5000),
 created_at timestamptz not null default now(),
 read_at timestamptz
);
create index if not exists pamasis_chat_conversations_inbox_idx on public.pamasis_chat_conversations(status,last_message_at desc);
create index if not exists pamasis_chat_conversations_assignee_idx on public.pamasis_chat_conversations(assigned_to,status,last_message_at desc);
create index if not exists pamasis_chat_messages_conversation_idx on public.pamasis_chat_messages(conversation_id,created_at);
alter table public.pamasis_chat_staff enable row level security;
alter table public.pamasis_leads enable row level security;
alter table public.pamasis_chat_conversations enable row level security;
alter table public.pamasis_chat_messages enable row level security;
revoke all on public.pamasis_chat_staff,public.pamasis_leads,public.pamasis_chat_conversations,public.pamasis_chat_messages from anon,authenticated;
grant all on public.pamasis_chat_staff,public.pamasis_leads,public.pamasis_chat_conversations,public.pamasis_chat_messages to service_role;
alter publication supabase_realtime add table public.pamasis_chat_conversations;
alter publication supabase_realtime add table public.pamasis_chat_messages;
