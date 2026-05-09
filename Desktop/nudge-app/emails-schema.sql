-- Run this in your Supabase SQL Editor to support the Shared Inbox/Department Emails feature

CREATE TABLE IF NOT EXISTS public.connected_emails (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies,
  department text, -- e.g., 'support', 'sales', 'general'
  provider text, -- e.g., 'google', 'microsoft'
  email text NOT NULL,
  display_name text,
  access_token text,
  refresh_token text,
  sync_status text DEFAULT 'connected',
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.connected_emails DISABLE ROW LEVEL SECURITY;
