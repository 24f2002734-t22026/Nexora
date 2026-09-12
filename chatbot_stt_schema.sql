-- ============================================================
-- AI VOICE CHATBOT & MOONSHINE STT INTEGRATION SCHEMA
-- SUPABASE / POSTGRESQL EXTENSION
-- ============================================================

-- ENUM FOR CHAT MESSAGE SENDER
do $$
begin
    create type chat_sender_role as enum ('interviewer', 'ai_assistant', 'system');
exception when duplicate_object then null;
end $$;

-- ENUM FOR STT AUDIO PROCESSING STATUS
do $$
begin
    create type stt_status as enum ('pending', 'processing', 'completed', 'failed');
exception when duplicate_object then null;
end $$;

-- 1. CHAT SESSIONS / CONVERSATIONS TABLE
create table if not exists chat_sessions (
    id uuid primary key default gen_random_uuid(),
    interviewer_id uuid not null references profiles(id) on delete cascade,
    job_id uuid references job_openings(id) on delete set null,
    application_id uuid references applications(id) on delete set null,
    title text default 'New Screening Session',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- 2. CHAT MESSAGES WITH AUDIO & STT METADATA
create table if not exists chat_messages (
    id uuid primary key default gen_random_uuid(),
    session_id uuid not null references chat_sessions(id) on delete cascade,
    sender_role chat_sender_role not null,
    message_text text not null,
    
    -- STT Audio Metadata (Moonshine Base)
    is_voice boolean default false,
    audio_file_url text,
    stt_model text default 'moonshine/base',
    stt_status stt_status default 'completed',
    stt_confidence numeric(5,4),
    audio_duration_seconds numeric(6,2),
    stt_latency_ms integer,
    
    -- AI Contextual references (e.g. candidate or fraud findings discussed)
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz not null default now()
);

-- 3. INTERVIEWER VOICE NOTES (FOR CANDIDATE SCREENING)
create table if not exists candidate_voice_notes (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references applications(id) on delete cascade,
    interviewer_id uuid not null references profiles(id) on delete cascade,
    audio_file_url text not null,
    transcript text,
    stt_model text default 'moonshine/base',
    stt_status stt_status not null default 'pending',
    stt_confidence numeric(5,4),
    duration_seconds numeric(6,2),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_chat_sessions_interviewer on chat_sessions(interviewer_id);
create index if not exists idx_chat_sessions_job on chat_sessions(job_id);
create index if not exists idx_chat_sessions_application on chat_sessions(application_id);
create index if not exists idx_chat_messages_session on chat_messages(session_id);
create index if not exists idx_voice_notes_application on candidate_voice_notes(application_id);
create index if not exists idx_voice_notes_interviewer on candidate_voice_notes(interviewer_id);

-- TRIGGERS FOR UPDATED_AT
drop trigger if exists update_chat_sessions_updated_at on chat_sessions;
create trigger update_chat_sessions_updated_at
before update on chat_sessions
for each row execute function update_updated_at_column();

drop trigger if exists update_voice_notes_updated_at on candidate_voice_notes;
create trigger update_voice_notes_updated_at
before update on candidate_voice_notes
for each row execute function update_updated_at_column();

-- ENABLE ROW LEVEL SECURITY
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table candidate_voice_notes enable row level security;

-- RLS POLICIES FOR CHAT SESSIONS
drop policy if exists "Interviewers can view own chat sessions" on chat_sessions;
create policy "Interviewers can view own chat sessions"
on chat_sessions for select to authenticated
using (interviewer_id = auth.uid());

drop policy if exists "Interviewers can create chat sessions" on chat_sessions;
create policy "Interviewers can create chat sessions"
on chat_sessions for insert to authenticated
with check (interviewer_id = auth.uid());

drop policy if exists "Interviewers can update own chat sessions" on chat_sessions;
create policy "Interviewers can update own chat sessions"
on chat_sessions for update to authenticated
using (interviewer_id = auth.uid())
with check (interviewer_id = auth.uid());

drop policy if exists "Interviewers can delete own chat sessions" on chat_sessions;
create policy "Interviewers can delete own chat sessions"
on chat_sessions for delete to authenticated
using (interviewer_id = auth.uid());

-- RLS POLICIES FOR CHAT MESSAGES
drop policy if exists "Interviewers can view messages in own sessions" on chat_messages;
create policy "Interviewers can view messages in own sessions"
on chat_messages for select to authenticated
using (
    exists (
        select 1 from chat_sessions s
        where s.id = chat_messages.session_id
        and s.interviewer_id = auth.uid()
    )
);

drop policy if exists "Interviewers can insert messages in own sessions" on chat_messages;
create policy "Interviewers can insert messages in own sessions"
on chat_messages for insert to authenticated
with check (
    exists (
        select 1 from chat_sessions s
        where s.id = chat_messages.session_id
        and s.interviewer_id = auth.uid()
    )
);

-- RLS POLICIES FOR CANDIDATE VOICE NOTES
drop policy if exists "Interviewers can view own voice notes" on candidate_voice_notes;
create policy "Interviewers can view own voice notes"
on candidate_voice_notes for select to authenticated
using (interviewer_id = auth.uid());

drop policy if exists "Interviewers can create voice notes" on candidate_voice_notes;
create policy "Interviewers can create voice notes"
on candidate_voice_notes for insert to authenticated
with check (interviewer_id = auth.uid());

drop policy if exists "Interviewers can update own voice notes" on candidate_voice_notes;
create policy "Interviewers can update own voice notes"
on candidate_voice_notes for update to authenticated
using (interviewer_id = auth.uid())
with check (interviewer_id = auth.uid());

drop policy if exists "Interviewers can delete own voice notes" on candidate_voice_notes;
create policy "Interviewers can delete own voice notes"
on candidate_voice_notes for delete to authenticated
using (interviewer_id = auth.uid());

-- STORAGE BUCKETS SETUP (Run via Supabase Dashboard or Storage API)
-- insert into storage.buckets (id, name, public) values ('audio-recordings', 'audio-recordings', false);
