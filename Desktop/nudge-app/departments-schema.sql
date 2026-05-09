-- Run this in your Supabase SQL Editor to support the Departments UI

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
