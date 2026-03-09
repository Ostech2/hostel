
-- Drop the restrictive warden insert policy
DROP POLICY IF EXISTS "Wardens can insert allocations in their hostels" ON public.room_allocations;

-- Create new policy allowing any warden to insert allocations
CREATE POLICY "Wardens can insert allocations"
ON public.room_allocations
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'warden'::app_role));
