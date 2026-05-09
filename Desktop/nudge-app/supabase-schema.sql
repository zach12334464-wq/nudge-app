-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)

-- 1. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  title text NOT NULL,
  status text DEFAULT 'todo',
  priority text DEFAULT 'medium',
  assignee text,
  locked_by text,
  locked_at timestamp with time zone,
  completed_by text,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  author text NOT NULL,
  initials text NOT NULL,
  text text NOT NULL,
  time text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  text text NOT NULL,
  for_member text,
  time text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Actions Table
CREATE TABLE IF NOT EXISTS public.actions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text,
  type text,
  subject text,
  body text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Schedule Blocks Table
CREATE TABLE IF NOT EXISTS public.schedule_blocks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text,
  date text,
  start_time text,
  end_time text,
  source text,
  created_at timestamp with time zone DEFAULT now()
);

-- Note: For simplicity during testing, we're keeping Row Level Security disabled. 
-- In a real production app, you would enable RLS and add policies here.
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_blocks DISABLE ROW LEVEL SECURITY;
