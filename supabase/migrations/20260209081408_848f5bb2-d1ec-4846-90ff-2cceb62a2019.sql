-- Fix inventory policies: Change ALL to specific INSERT/UPDATE/DELETE so SELECT isn't restricted
DROP POLICY IF EXISTS "Wardens can manage inventory in their hostels" ON public.inventory;

CREATE POLICY "Wardens can insert inventory in their hostels" 
ON public.inventory 
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = inventory.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can update inventory in their hostels" 
ON public.inventory 
FOR UPDATE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = inventory.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can delete inventory in their hostels" 
ON public.inventory 
FOR DELETE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = inventory.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

-- Fix rooms policies
DROP POLICY IF EXISTS "Wardens can manage rooms in their hostels" ON public.rooms;

CREATE POLICY "Wardens can insert rooms in their hostels" 
ON public.rooms 
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = rooms.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can update rooms in their hostels" 
ON public.rooms 
FOR UPDATE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = rooms.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can delete rooms in their hostels" 
ON public.rooms 
FOR DELETE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM hostels 
    WHERE hostels.id = rooms.hostel_id 
    AND hostels.warden_id = auth.uid()
  )
);

-- Fix room_allocations policies
DROP POLICY IF EXISTS "Wardens can manage allocations in their hostels" ON public.room_allocations;

CREATE POLICY "Wardens can insert allocations in their hostels" 
ON public.room_allocations 
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    WHERE r.id = room_allocations.room_id 
    AND h.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can update allocations in their hostels" 
ON public.room_allocations 
FOR UPDATE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    WHERE r.id = room_allocations.room_id 
    AND h.warden_id = auth.uid()
  )
);

CREATE POLICY "Wardens can delete allocations in their hostels" 
ON public.room_allocations 
FOR DELETE
USING (
  has_role(auth.uid(), 'warden'::app_role) AND 
  EXISTS (
    SELECT 1 FROM rooms r
    JOIN hostels h ON r.hostel_id = h.id
    WHERE r.id = room_allocations.room_id 
    AND h.warden_id = auth.uid()
  )
);