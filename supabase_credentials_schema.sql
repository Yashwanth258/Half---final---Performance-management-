-- ==============================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR MANAGER & TRAINER CREDENTIALS / SIGN-IN
-- Project URL: https://fuqqhvqqgogggcttshlz.supabase.co
-- Run this script in: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- 1. MANAGER SIGN-IN CREDENTIALS TABLE
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

-- 2. TRAINER SIGN-IN CREDENTIALS TABLE
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

-- 3. UNIFIED USER CREDENTIALS TABLE (Fast lookup by ID or Email)
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
-- ==============================================================================

ALTER TABLE public.manager_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "manager_credentials_open" ON public.manager_credentials;
    CREATE POLICY "manager_credentials_open" ON public.manager_credentials FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "trainer_credentials_open" ON public.trainer_credentials;
    CREATE POLICY "trainer_credentials_open" ON public.trainer_credentials FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "user_credentials_open" ON public.user_credentials;
    CREATE POLICY "user_credentials_open" ON public.user_credentials FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Enable Realtime replication
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_credentials;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trainer_credentials;
EXCEPTION WHEN OTHERS THEN
    -- Ignore if already added to publication
    NULL;
END $$;
