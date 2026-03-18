-- Create activities table for tracking system events
CREATE TABLE public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'added', 'allocated', 'damaged', 'maintained', 'deleted', 'updated'
    item TEXT NOT NULL, -- e.g. "Student: John Doe" or "20 Mattresses"
    location TEXT, -- e.g. "Male Hostel A"
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read activities
CREATE POLICY "Anyone can read activities"
ON public.activities FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert activities (logging)
CREATE POLICY "Anyone can log activities"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (true);
