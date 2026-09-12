-- ============================================================
-- RESUME SCREENING SOFTWARE
-- SUPABASE / POSTGRESQL DATABASE SCHEMA
-- ============================================================

create extension if not exists "pgcrypto";

-- ENUM TYPES
do $$
begin
    create type application_status as enum (
        'applied', 'screening', 'shortlisted',
        'interview', 'rejected', 'hired'
    );
exception when duplicate_object then null;
end $$;

do $$
begin
    create type fraud_type as enum (
        'white_font', 'tiny_text', 'off_margin_text',
        'hidden_behind_image', 'hidden_text',
        'suspicious_formatting', 'metadata_anomaly',
        'duplicate_content', 'other'
    );
exception when duplicate_object then null;
end $$;

do $$
begin
    create type fraud_severity as enum (
        'low', 'medium', 'high', 'critical'
    );
exception when duplicate_object then null;
end $$;

do $$
begin
    create type processing_status as enum (
        'pending', 'processing', 'completed', 'failed'
    );
exception when duplicate_object then null;
end $$;

-- PROFILES
create table if not exists profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text,
    email text,
    avatar_url text,
    company_name text,
    role text default 'interviewer',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- JOB OPENINGS
create table if not exists job_openings (
    id uuid primary key default gen_random_uuid(),
    interviewer_id uuid not null references profiles(id) on delete cascade,
    title text not null,
    department text,
    location text,
    employment_type text,
    description text,
    requirements text,
    responsibilities text,
    skills_required jsonb default '[]'::jsonb,
    experience_min_years numeric(4,1),
    experience_max_years numeric(4,1),
    status text not null default 'open',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    closed_at timestamptz
);

-- CANDIDATES
create table if not exists candidates (
    id uuid primary key default gen_random_uuid(),
    full_name text,
    email text,
    phone text,
    linkedin_url text,
    github_url text,
    portfolio_url text,
    location text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- APPLICATIONS
create table if not exists applications (
    id uuid primary key default gen_random_uuid(),
    job_id uuid not null references job_openings(id) on delete cascade,
    candidate_id uuid not null references candidates(id) on delete cascade,
    status application_status not null default 'applied',
    applied_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    interviewer_notes text,
    overall_score numeric(5,2),
    ai_recommendation text,
    unique(job_id, candidate_id)
);

-- RESUMES
create table if not exists resumes (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references applications(id) on delete cascade,
    file_name text not null,
    file_path text not null,
    file_type text,
    file_size bigint,
    file_hash text,
    uploaded_at timestamptz not null default now(),
    parsing_status processing_status not null default 'pending',
    fraud_scan_status processing_status not null default 'pending',
    parser_version text,
    fraud_detector_version text
);

-- AI PARSED RESUME DATA
create table if not exists parsed_resume_data (
    id uuid primary key default gen_random_uuid(),
    resume_id uuid not null unique references resumes(id) on delete cascade,
    raw_text text,
    summary text,
    parsed_name text,
    parsed_email text,
    parsed_phone text,
    location text,
    total_experience_years numeric(5,2),
    current_job_title text,
    current_company text,
    skills jsonb default '[]'::jsonb,
    education jsonb default '[]'::jsonb,
    experience jsonb default '[]'::jsonb,
    projects jsonb default '[]'::jsonb,
    certifications jsonb default '[]'::jsonb,
    achievements jsonb default '[]'::jsonb,
    languages jsonb default '[]'::jsonb,
    publications jsonb default '[]'::jsonb,
    extracted_links jsonb default '[]'::jsonb,
    ai_score numeric(5,2),
    ai_recommendation text,
    parsing_confidence numeric(5,4),
    parser_model text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- RESUME/JOB MATCHING
create table if not exists resume_match_results (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null unique references applications(id) on delete cascade,
    overall_match_score numeric(5,2),
    skills_match_score numeric(5,2),
    experience_match_score numeric(5,2),
    education_match_score numeric(5,2),
    keyword_match_score numeric(5,2),
    semantic_match_score numeric(5,2),
    matched_skills jsonb default '[]'::jsonb,
    missing_skills jsonb default '[]'::jsonb,
    matching_experience jsonb default '[]'::jsonb,
    concerns jsonb default '[]'::jsonb,
    strengths jsonb default '[]'::jsonb,
    ai_explanation text,
    model_name text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- OVERALL FRAUD REPORT
create table if not exists resume_fraud_reports (
    id uuid primary key default gen_random_uuid(),
    resume_id uuid not null unique references resumes(id) on delete cascade,
    fraud_detected boolean not null default false,
    risk_score numeric(5,2) default 0,
    confidence_score numeric(5,2),
    total_findings integer not null default 0,
    critical_findings integer not null default 0,
    high_findings integer not null default 0,
    medium_findings integer not null default 0,
    low_findings integer not null default 0,
    scan_status processing_status not null default 'pending',
    detector_model text,
    detector_version text,
    scan_summary text,
    scanned_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- INDIVIDUAL FRAUD FINDINGS
create table if not exists fraud_findings (
    id uuid primary key default gen_random_uuid(),
    fraud_report_id uuid not null references resume_fraud_reports(id) on delete cascade,
    fraud_type fraud_type not null,
    severity fraud_severity not null,
    confidence_score numeric(5,2),
    page_number integer,
    description text,
    extracted_text text,
    expected_value text,
    detected_value text,
    bounding_box jsonb,
    evidence jsonb default '{}'::jsonb,
    screenshot_path text,
    created_at timestamptz not null default now()
);

-- PROCESSING LOGS
create table if not exists resume_processing_logs (
    id uuid primary key default gen_random_uuid(),
    resume_id uuid not null references resumes(id) on delete cascade,
    stage text not null,
    status processing_status not null,
    message text,
    error_details text,
    model_name text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz not null default now()
);

-- MANUAL SCREENING REVIEWS
create table if not exists screening_reviews (
    id uuid primary key default gen_random_uuid(),
    application_id uuid not null references applications(id) on delete cascade,
    interviewer_id uuid not null references profiles(id) on delete cascade,
    decision text,
    rating numeric(3,1),
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- INDEXES
create index if not exists idx_job_openings_interviewer on job_openings(interviewer_id);
create index if not exists idx_job_openings_status on job_openings(status);
create index if not exists idx_applications_job on applications(job_id);
create index if not exists idx_applications_candidate on applications(candidate_id);
create index if not exists idx_applications_status on applications(status);
create index if not exists idx_resumes_application on resumes(application_id);
create index if not exists idx_parsed_resume_resume on parsed_resume_data(resume_id);
create index if not exists idx_fraud_reports_resume on resume_fraud_reports(resume_id);
create index if not exists idx_fraud_findings_report on fraud_findings(fraud_report_id);
create index if not exists idx_fraud_findings_type on fraud_findings(fraud_type);
create index if not exists idx_fraud_findings_severity on fraud_findings(severity);
create index if not exists idx_processing_logs_resume on resume_processing_logs(resume_id);

-- AUTOMATIC PROFILE CREATION AFTER GOOGLE/SUPABASE AUTH
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, full_name, email, avatar_url)
    values (
        new.id,
        coalesce(
            new.raw_user_meta_data->>'full_name',
            new.raw_user_meta_data->>'name'
        ),
        new.email,
        new.raw_user_meta_data->>'avatar_url'
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- UPDATED_AT FUNCTION
create or replace function update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

-- UPDATED_AT TRIGGERS
drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at
before update on profiles
for each row execute function update_updated_at_column();

drop trigger if exists update_jobs_updated_at on job_openings;
create trigger update_jobs_updated_at
before update on job_openings
for each row execute function update_updated_at_column();

drop trigger if exists update_candidates_updated_at on candidates;
create trigger update_candidates_updated_at
before update on candidates
for each row execute function update_updated_at_column();

drop trigger if exists update_applications_updated_at on applications;
create trigger update_applications_updated_at
before update on applications
for each row execute function update_updated_at_column();

drop trigger if exists update_parsed_resume_updated_at on parsed_resume_data;
create trigger update_parsed_resume_updated_at
before update on parsed_resume_data
for each row execute function update_updated_at_column();

drop trigger if exists update_match_results_updated_at on resume_match_results;
create trigger update_match_results_updated_at
before update on resume_match_results
for each row execute function update_updated_at_column();

drop trigger if exists update_fraud_reports_updated_at on resume_fraud_reports;
create trigger update_fraud_reports_updated_at
before update on resume_fraud_reports
for each row execute function update_updated_at_column();

drop trigger if exists update_screening_reviews_updated_at on screening_reviews;
create trigger update_screening_reviews_updated_at
before update on screening_reviews
for each row execute function update_updated_at_column();

-- ENABLE RLS
alter table profiles enable row level security;
alter table job_openings enable row level security;
alter table candidates enable row level security;
alter table applications enable row level security;
alter table resumes enable row level security;
alter table parsed_resume_data enable row level security;
alter table resume_match_results enable row level security;
alter table resume_fraud_reports enable row level security;
alter table fraud_findings enable row level security;
alter table resume_processing_logs enable row level security;
alter table screening_reviews enable row level security;

-- PROFILE POLICIES
drop policy if exists "Users can view own profile" on profiles;
create policy "Users can view own profile"
on profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile"
on profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- JOB POLICIES
drop policy if exists "Users can view own jobs" on job_openings;
create policy "Users can view own jobs"
on job_openings for select to authenticated
using (interviewer_id = auth.uid());

drop policy if exists "Users can create jobs" on job_openings;
create policy "Users can create jobs"
on job_openings for insert to authenticated
with check (interviewer_id = auth.uid());

drop policy if exists "Users can update own jobs" on job_openings;
create policy "Users can update own jobs"
on job_openings for update to authenticated
using (interviewer_id = auth.uid())
with check (interviewer_id = auth.uid());

drop policy if exists "Users can delete own jobs" on job_openings;
create policy "Users can delete own jobs"
on job_openings for delete to authenticated
using (interviewer_id = auth.uid());

-- CANDIDATE POLICY
drop policy if exists "Interviewers can view candidates" on candidates;
create policy "Interviewers can view candidates"
on candidates for select to authenticated
using (
    exists (
        select 1
        from applications a
        join job_openings j on j.id = a.job_id
        where a.candidate_id = candidates.id
        and j.interviewer_id = auth.uid()
    )
);

-- APPLICATION POLICIES
drop policy if exists "Interviewers can view applications" on applications;
create policy "Interviewers can view applications"
on applications for select to authenticated
using (
    exists (
        select 1
        from job_openings j
        where j.id = applications.job_id
        and j.interviewer_id = auth.uid()
    )
);

drop policy if exists "Interviewers can update applications" on applications;
create policy "Interviewers can update applications"
on applications for update to authenticated
using (
    exists (
        select 1
        from job_openings j
        where j.id = applications.job_id
        and j.interviewer_id = auth.uid()
    )
)
with check (
    exists (
        select 1
        from job_openings j
        where j.id = applications.job_id
        and j.interviewer_id = auth.uid()
    )
);

-- RESUME POLICY
drop policy if exists "Interviewers can view resumes" on resumes;
create policy "Interviewers can view resumes"
on resumes for select to authenticated
using (
    exists (
        select 1
        from applications a
        join job_openings j on j.id = a.job_id
        where a.id = resumes.application_id
        and j.interviewer_id = auth.uid()
    )
);

-- PARSED RESUME POLICY
drop policy if exists "Interviewers can view parsed resumes" on parsed_resume_data;
create policy "Interviewers can view parsed resumes"
on parsed_resume_data for select to authenticated
using (
    exists (
        select 1
        from resumes r
        join applications a on a.id = r.application_id
        join job_openings j on j.id = a.job_id
        where r.id = parsed_resume_data.resume_id
        and j.interviewer_id = auth.uid()
    )
);

-- MATCH RESULT POLICY
drop policy if exists "Interviewers can view match results" on resume_match_results;
create policy "Interviewers can view match results"
on resume_match_results for select to authenticated
using (
    exists (
        select 1
        from applications a
        join job_openings j on j.id = a.job_id
        where a.id = resume_match_results.application_id
        and j.interviewer_id = auth.uid()
    )
);

-- FRAUD REPORT POLICY
drop policy if exists "Interviewers can view fraud reports" on resume_fraud_reports;
create policy "Interviewers can view fraud reports"
on resume_fraud_reports for select to authenticated
using (
    exists (
        select 1
        from resumes r
        join applications a on a.id = r.application_id
        join job_openings j on j.id = a.job_id
        where r.id = resume_fraud_reports.resume_id
        and j.interviewer_id = auth.uid()
    )
);

-- FRAUD FINDING POLICY
drop policy if exists "Interviewers can view fraud findings" on fraud_findings;
create policy "Interviewers can view fraud findings"
on fraud_findings for select to authenticated
using (
    exists (
        select 1
        from resume_fraud_reports fr
        join resumes r on r.id = fr.resume_id
        join applications a on a.id = r.application_id
        join job_openings j on j.id = a.job_id
        where fr.id = fraud_findings.fraud_report_id
        and j.interviewer_id = auth.uid()
    )
);

-- PROCESSING LOG POLICY
drop policy if exists "Interviewers can view processing logs" on resume_processing_logs;
create policy "Interviewers can view processing logs"
on resume_processing_logs for select to authenticated
using (
    exists (
        select 1
        from resumes r
        join applications a on a.id = r.application_id
        join job_openings j on j.id = a.job_id
        where r.id = resume_processing_logs.resume_id
        and j.interviewer_id = auth.uid()
    )
);

-- SCREENING REVIEW POLICIES
drop policy if exists "Interviewers can view reviews" on screening_reviews;
create policy "Interviewers can view reviews"
on screening_reviews for select to authenticated
using (interviewer_id = auth.uid());

drop policy if exists "Interviewers can create reviews" on screening_reviews;
create policy "Interviewers can create reviews"
on screening_reviews for insert to authenticated
with check (interviewer_id = auth.uid());

drop policy if exists "Interviewers can update reviews" on screening_reviews;
create policy "Interviewers can update reviews"
on screening_reviews for update to authenticated
using (interviewer_id = auth.uid())
with check (interviewer_id = auth.uid());

-- DASHBOARD VIEW
create or replace view dashboard_applications
with (security_invoker = true)
as
select
    a.id as application_id,
    a.status,
    a.applied_at,
    a.overall_score,
    a.ai_recommendation,
    j.id as job_id,
    j.title as job_title,
    j.department,
    j.location,
    c.id as candidate_id,
    c.full_name as candidate_name,
    c.email as candidate_email,
    c.phone as candidate_phone,
    r.id as resume_id,
    r.file_name,
    r.parsing_status,
    r.fraud_scan_status,
    fr.fraud_detected,
    fr.risk_score as fraud_risk_score,
    fr.total_findings,
    fr.critical_findings,
    fr.high_findings,
    fr.medium_findings,
    fr.low_findings,
    pm.overall_match_score
from applications a
join job_openings j on j.id = a.job_id
join candidates c on c.id = a.candidate_id
left join resumes r on r.application_id = a.id
left join resume_fraud_reports fr on fr.resume_id = r.id
left join resume_match_results pm on pm.application_id = a.id;

-- FRAUD DASHBOARD VIEW
create or replace view fraud_dashboard
with (security_invoker = true)
as
select
    ff.id as finding_id,
    ff.fraud_type,
    ff.severity,
    ff.confidence_score,
    ff.page_number,
    ff.description,
    ff.extracted_text,
    ff.expected_value,
    ff.detected_value,
    ff.bounding_box,
    ff.evidence,
    ff.screenshot_path,
    r.id as resume_id,
    r.file_name,
    a.id as application_id,
    c.id as candidate_id,
    c.full_name as candidate_name,
    j.id as job_id,
    j.title as job_title
from fraud_findings ff
join resume_fraud_reports fr on fr.id = ff.fraud_report_id
join resumes r on r.id = fr.resume_id
join applications a on a.id = r.application_id
join candidates c on c.id = a.candidate_id
join job_openings j on j.id = a.job_id;

-- COMPLETE APPLICATION DETAILS FUNCTION
create or replace function get_application_details(application_uuid uuid)
returns jsonb
language plpgsql
security invoker
as $$
declare
    result jsonb;
begin
    select jsonb_build_object(
        'application', to_jsonb(a),
        'candidate', to_jsonb(c),
        'job', to_jsonb(j),
        'resume', to_jsonb(r),
        'parsed_resume', to_jsonb(pr),
        'match_result', to_jsonb(mr),
        'fraud_report', to_jsonb(fr),
        'fraud_findings',
        coalesce(
            (
                select jsonb_agg(to_jsonb(ff))
                from fraud_findings ff
                where ff.fraud_report_id = fr.id
            ),
            '[]'::jsonb
        )
    )
    into result
    from applications a
    join candidates c on c.id = a.candidate_id
    join job_openings j on j.id = a.job_id
    left join resumes r on r.application_id = a.id
    left join parsed_resume_data pr on pr.resume_id = r.id
    left join resume_match_results mr on mr.application_id = a.id
    left join resume_fraud_reports fr on fr.resume_id = r.id
    where a.id = application_uuid
    and j.interviewer_id = auth.uid();

    return result;
end;
$$;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
