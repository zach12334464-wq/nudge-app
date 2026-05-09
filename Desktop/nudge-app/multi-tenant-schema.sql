-- Run this in your Supabase SQL Editor to support the Owner/Employee architecture

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. User Profiles Table (links Auth Users to Companies)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users PRIMARY KEY,
  company_id uuid REFERENCES public.companies,
  full_name text,
  role text DEFAULT 'employee', -- 'owner' or 'employee'
  department text,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Add company_id to existing tables so data is isolated per company
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies;
ALTER TABLE public.actions ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies;
ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies;

-- Disable RLS for testing, but in production we will use company_id to restrict access
ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
