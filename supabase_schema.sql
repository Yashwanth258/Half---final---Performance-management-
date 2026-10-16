-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR PERFORMANCE MANAGEMENT SYSTEM
-- Project URL: https://fuqqhvqqgogggcttshlz.supabase.co
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Trainers & Managers)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    uid TEXT UNIQUE,
    employee_id TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    company_email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('TRAINER', 'MANAGER')),
    department TEXT DEFAULT 'GenAI',
    team_id TEXT DEFAULT 'team-genai',
    team_name TEXT DEFAULT 'GenAI Department',
    manager_id TEXT,
    manager_name TEXT,
    manager_email TEXT,
    designation TEXT NOT NULL,
    location TEXT DEFAULT '',
    subject TEXT DEFAULT '',
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TEAMS TABLE
CREATE TABLE IF NOT EXISTS public.teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    manager_id TEXT,
    manager_name TEXT,
    department TEXT,
    location TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. DAILY UPDATES (Attendance & Work Telemetry)
CREATE TABLE IF NOT EXISTS public.daily_updates (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT,
    employee_id TEXT NOT NULL,
    employee_name TEXT NOT NULL,
    user_email TEXT,
    team_id TEXT,
    manager_id TEXT,
    date DATE NOT NULL,
    classes_handled TEXT DEFAULT '',
    classes_count INT DEFAULT 0,
    class_duration_minutes INT DEFAULT 60,
    total_classes_duration_minutes INT DEFAULT 0,
    practice_sessions_count INT DEFAULT 0,
    practice_duration_minutes INT DEFAULT 60,
    total_practice_duration_minutes INT DEFAULT 0,
    total_sessions_count INT DEFAULT 0,
    session_minutes_calculated INT DEFAULT 0,
    tasks_worked_on TEXT DEFAULT '',
    project_updates TEXT,
    additional_category TEXT DEFAULT 'None',
    additional_responsibilities TEXT,
    paper_evaluation_hours NUMERIC(6,2) DEFAULT 0,
    in_service_hours NUMERIC(6,2) DEFAULT 0,
    calculated_total_hours NUMERIC(6,2) DEFAULT 6,
    standard_working_hours NUMERIC(6,2) DEFAULT 6,
    weekly_standard_hours NUMERIC(6,2) DEFAULT 36,
    extra_hours_worked NUMERIC(6,2) DEFAULT 0,
    burnout_risk_level TEXT DEFAULT 'Normal',
    extra_work_reason TEXT,
    extra_work_details TEXT,
    challenges_or_blockers TEXT,
    remarks TEXT,
    hours_logged NUMERIC(6,2) DEFAULT 6,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. CLASSES TABLE (Scheduled Delivery Sessions)
CREATE TABLE IF NOT EXISTS public.classes (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    user_id TEXT,
    employee_id TEXT,
    employee_name TEXT,
    team_id TEXT,
    manager_id TEXT,
    class_name TEXT NOT NULL,
    batch TEXT NOT NULL,
    subject TEXT NOT NULL,
    topic TEXT,
    date DATE NOT NULL,
    start_time TEXT DEFAULT '09:00',
    end_time TEXT DEFAULT '10:30',
    duration_minutes INT DEFAULT 90,
    number_of_students INT DEFAULT 35,
    delivery_mode TEXT DEFAULT 'Online',
    status TEXT DEFAULT 'Scheduled',
    remarks TEXT,
    room_or_meeting_link TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    task_name TEXT NOT NULL,
    description TEXT DEFAULT '',
    assigned_by TEXT,
    assigned_by_name TEXT,
    assigned_to TEXT,
    assigned_to_name TEXT,
    assigned_to_employee_id TEXT,
    team_id TEXT,
    manager_id TEXT,
    priority TEXT DEFAULT 'Medium',
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status TEXT DEFAULT 'In Progress',
    completion_percentage INT DEFAULT 0,
    remarks TEXT,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PROJECTS TABLE
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    project_name TEXT NOT NULL,
    project_description TEXT DEFAULT '',
    start_date DATE,
    expected_completion_date DATE,
    current_stage TEXT DEFAULT 'Planning',
    overall_completion_percentage INT DEFAULT 0,
    current_status TEXT DEFAULT 'On Track',
    manager_id TEXT,
    manager_name TEXT,
    assigned_to TEXT,
    assigned_to_name TEXT,
    assigned_to_employee_id TEXT,
    team_id TEXT,
    remarks TEXT,
    repository_url TEXT,
    deliverables TEXT,
    is_self_assigned BOOLEAN DEFAULT FALSE,
    is_open_for_self_assignment BOOLEAN DEFAULT FALSE,
    milestones JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE WEIGHTS TABLE
CREATE TABLE IF NOT EXISTS public.performance_weights (
    id TEXT PRIMARY KEY DEFAULT 'default',
    class_delivery INT DEFAULT 40,
    task_completion INT DEFAULT 30,
    project_progress INT DEFAULT 20,
    additional_contribution INT DEFAULT 10,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. FEEDBACKS TABLE
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    trainer_id TEXT,
    trainer_name TEXT,
    trainer_employee_id TEXT,
    student_rating NUMERIC(3,2) DEFAULT 4.60,
    qa_score NUMERIC(3,2) DEFAULT 4.50,
    batch TEXT,
    comments TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MANAGER CREDENTIALS (Manager Sign-In)
CREATE TABLE IF NOT EXISTS public.manager_credentials (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'MANAGER',
    department TEXT DEFAULT 'GenAI',
    uid TEXT,
    profile JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. TRAINER CREDENTIALS (Trainer Sign-In)
CREATE TABLE IF NOT EXISTS public.trainer_credentials (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'TRAINER',
    department TEXT DEFAULT 'GenAI',
    manager_id TEXT,
    manager_name TEXT,
    manager_email TEXT,
    uid TEXT,
    profile JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. USER CREDENTIALS (General Account Index)
CREATE TABLE IF NOT EXISTS public.user_credentials (
    id TEXT PRIMARY KEY,
    employee_id TEXT,
    email TEXT,
    password TEXT NOT NULL,
    role TEXT,
    uid TEXT,
    profile JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enabling RLS with open access policies so the frontend application can read and write
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Allow unrestricted CRUD for all authenticated and anonymous web users
DO $$
BEGIN
    DROP POLICY IF EXISTS "profiles_open" ON public.profiles;
    CREATE POLICY "profiles_open" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "teams_open" ON public.teams;
    CREATE POLICY "teams_open" ON public.teams FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "daily_updates_open" ON public.daily_updates;
    CREATE POLICY "daily_updates_open" ON public.daily_updates FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "classes_open" ON public.classes;
    CREATE POLICY "classes_open" ON public.classes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "tasks_open" ON public.tasks;
    CREATE POLICY "tasks_open" ON public.tasks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "projects_open" ON public.projects;
    CREATE POLICY "projects_open" ON public.projects FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "performance_weights_open" ON public.performance_weights;
    CREATE POLICY "performance_weights_open" ON public.performance_weights FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "feedbacks_open" ON public.feedbacks;
    CREATE POLICY "feedbacks_open" ON public.feedbacks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "manager_credentials_open" ON public.manager_credentials;
    CREATE POLICY "manager_credentials_open" ON public.manager_credentials FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "trainer_credentials_open" ON public.trainer_credentials;
    CREATE POLICY "trainer_credentials_open" ON public.trainer_credentials FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "user_credentials_open" ON public.user_credentials;
    CREATE POLICY "user_credentials_open" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime replication on public tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_updates;
ALTER PUBLICATION supabase_realtime ADD TABLE public.classes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_weights;

-- ==============================================================================
-- INITIAL SEED DATA
-- ==============================================================================

-- 1. Seed Teams
INSERT INTO public.teams (id, name, manager_id, manager_name, department, location, description)
VALUES 
('team-frontend', 'Frontend Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Frontend', 'Austin, TX', 'React, TypeScript, Next.js, and Modern UI/UX Engineering.'),
('team-backend', 'Backend Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Backend', 'Seattle, WA', 'Node.js, Distributed APIs, PostgreSQL, and Cloud-Native Services.'),
('team-genai', 'GenAI Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'GenAI', 'San Francisco, CA', 'Generative AI, Large Language Models, Multi-Agent Systems & Prompt Engineering.')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Default Manager & Instructors
INSERT INTO public.profiles (uid, employee_id, full_name, company_email, role, department, team_id, team_name, manager_id, manager_name, designation, location, subject, is_active)
VALUES 
('mgr-enterprise-01', 'MGR-7701', 'Sarah Jenkins', 'manager@enterprise.com', 'MANAGER', 'GenAI', 'team-genai', 'Enterprise Training & Talent Org', 'exec-global-00', 'Executive Leadership', 'VP of Technical Enablement & Training', '', 'Enterprise Curriculum Leadership', TRUE),
('trainer-alex-01', 'NW1048', 'Alex Morgan', 'trainer.alex@enterprise.com', 'TRAINER', 'GenAI', 'team-genai', 'GenAI Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Software Development Instructor', 'San Francisco, CA', 'Generative AI & LLM Systems', TRUE),
('trainer-priya-02', 'NW1052', 'Priya Sharma', 'priya.sharma@enterprise.com', 'TRAINER', 'GenAI', 'team-genai', 'GenAI Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Software Development Instructor', 'San Francisco, CA', 'Generative AI & Machine Learning', TRUE),
('trainer-david-03', 'NW1055', 'David Miller', 'david.miller@enterprise.com', 'TRAINER', 'Backend', 'team-backend', 'Backend Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Software Development Instructor', 'Seattle, WA', 'Node.js & Distributed Systems', TRUE),
('trainer-ananya-04', 'NW1061', 'Ananya Roy', 'ananya.roy@enterprise.com', 'TRAINER', 'Frontend', 'team-frontend', 'Frontend Department', 'mgr-enterprise-01', 'Sarah Jenkins', 'Software Development Instructor', 'Austin, TX', 'React & Modern Frontend Systems', TRUE)
ON CONFLICT (employee_id) DO NOTHING;

-- 3. Seed Performance Weights
INSERT INTO public.performance_weights (id, class_delivery, task_completion, project_progress, additional_contribution)
VALUES ('default', 40, 30, 20, 10)
ON CONFLICT (id) DO UPDATE SET
    class_delivery = EXCLUDED.class_delivery,
    task_completion = EXCLUDED.task_completion,
    project_progress = EXCLUDED.project_progress,
    additional_contribution = EXCLUDED.additional_contribution;

-- 4. Seed Scheduled Classes
INSERT INTO public.classes (id, user_id, employee_id, employee_name, team_id, manager_id, class_name, batch, subject, topic, date, start_time, end_time, duration_minutes, number_of_students, delivery_mode, status)
VALUES
('cls-01', 'trainer-alex-01', 'NW1048', 'Alex Morgan', 'team-genai', 'mgr-enterprise-01', 'GenAI Foundation Cohort A', 'GenAI-2026-A', 'Generative AI & LLM Systems', 'Prompt Engineering & Few-Shot In-Context Learning', CURRENT_DATE, '09:00', '10:30', 90, 42, 'Online', 'Completed'),
('cls-02', 'trainer-alex-01', 'NW1048', 'Alex Morgan', 'team-genai', 'mgr-enterprise-01', 'Multi-Agent Frameworks Lab', 'GenAI-2026-B', 'Generative AI & LLM Systems', 'LangChain & Tool Invocation State Machines', CURRENT_DATE, '11:00', '12:30', 90, 38, 'Online', 'Ongoing'),
('cls-03', 'trainer-priya-02', 'NW1052', 'Priya Sharma', 'team-genai', 'mgr-enterprise-01', 'Machine Learning Foundations', 'ML-2026-C', 'Generative AI & Machine Learning', 'Vector Embeddings & Semantic Search Pipelines', CURRENT_DATE, '14:00', '15:30', 90, 35, 'Online', 'Scheduled')
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Tasks
INSERT INTO public.tasks (id, task_name, description, assigned_by, assigned_by_name, assigned_to, assigned_to_name, assigned_to_employee_id, team_id, manager_id, priority, assigned_date, due_date, status, completion_percentage)
VALUES
('tsk-01', 'Update RAG Workshop Architecture Slides', 'Revise diagram for hybrid vector-keyword retrieval pipelines for upcoming cohort', 'mgr-enterprise-01', 'Sarah Jenkins', 'trainer-alex-01', 'Alex Morgan', 'NW1048', 'team-genai', 'mgr-enterprise-01', 'High', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '2 days', 'In Progress', 75),
('tsk-02', 'Build Hands-On Colab Notebooks for LoRA Fine-Tuning', 'Create test notebooks with sample small weights for quick trainee evaluation', 'mgr-enterprise-01', 'Sarah Jenkins', 'trainer-alex-01', 'Alex Morgan', 'NW1048', 'team-genai', 'mgr-enterprise-01', 'Urgent', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '1 days', 'In Progress', 85)
ON CONFLICT (id) DO NOTHING;
