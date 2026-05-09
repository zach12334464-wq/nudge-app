-- Run this in your Supabase SQL Editor to add departments to the schedule

ALTER TABLE public.schedule_blocks ADD COLUMN IF NOT EXISTS department text DEFAULT 'General';
