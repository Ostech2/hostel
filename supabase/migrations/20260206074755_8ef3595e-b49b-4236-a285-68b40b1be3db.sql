-- Allow wardens to insert new student profiles
CREATE POLICY "Wardens can insert student profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'warden'::app_role));

-- Allow wardens to update student profiles
CREATE POLICY "Wardens can update student profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'warden'::app_role));