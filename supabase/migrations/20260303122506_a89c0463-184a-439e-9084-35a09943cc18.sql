
-- Drop existing restrictive warden INSERT policies for rooms and inventory
DROP POLICY IF EXISTS "Wardens can insert rooms in their hostels" ON public.rooms;
DROP POLICY IF EXISTS "Wardens can insert inventory in their hostels" ON public.inventory;

-- Allow wardens to insert rooms in ANY hostel
CREATE POLICY "Wardens can insert rooms"
ON public.rooms FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'warden'::app_role));

-- Allow wardens to insert inventory in ANY hostel  
CREATE POLICY "Wardens can insert inventory"
ON public.inventory FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'warden'::app_role));
