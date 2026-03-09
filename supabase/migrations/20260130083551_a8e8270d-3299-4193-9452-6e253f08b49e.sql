-- Create hostels table
CREATE TABLE public.hostels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  capacity INTEGER NOT NULL DEFAULT 0,
  warden_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  floor INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(hostel_id, room_number)
);

-- Create inventory categories
CREATE TYPE public.inventory_category AS ENUM ('furniture', 'consumables', 'electronics', 'other');

-- Create inventory/stock table
CREATE TABLE public.inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hostel_id UUID NOT NULL REFERENCES public.hostels(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category inventory_category NOT NULL DEFAULT 'other',
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_stock_level INTEGER DEFAULT 5,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room allocations table
CREATE TABLE public.room_allocations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_by UUID REFERENCES auth.users(id),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.hostels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_allocations ENABLE ROW LEVEL SECURITY;

-- Hostels policies
CREATE POLICY "Admins and wardens can view all hostels"
ON public.hostels FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warden'));

CREATE POLICY "Admins can manage hostels"
ON public.hostels FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Wardens can insert hostels"
ON public.hostels FOR INSERT
WITH CHECK (has_role(auth.uid(), 'warden'));

CREATE POLICY "Wardens can update their hostels"
ON public.hostels FOR UPDATE
USING (has_role(auth.uid(), 'warden') AND warden_id = auth.uid());

-- Rooms policies
CREATE POLICY "Admins and wardens can view all rooms"
ON public.rooms FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warden'));

CREATE POLICY "Admins can manage rooms"
ON public.rooms FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Wardens can manage rooms in their hostels"
ON public.rooms FOR ALL
USING (
  has_role(auth.uid(), 'warden') AND 
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND warden_id = auth.uid())
);

-- Inventory policies
CREATE POLICY "Admins and wardens can view inventory"
ON public.inventory FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warden'));

CREATE POLICY "Admins can manage all inventory"
ON public.inventory FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Wardens can manage inventory in their hostels"
ON public.inventory FOR ALL
USING (
  has_role(auth.uid(), 'warden') AND 
  EXISTS (SELECT 1 FROM public.hostels WHERE id = hostel_id AND warden_id = auth.uid())
);

-- Room allocations policies
CREATE POLICY "Admins and wardens can view allocations"
ON public.room_allocations FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warden'));

CREATE POLICY "Students can view their own allocations"
ON public.room_allocations FOR SELECT
USING (student_id = auth.uid());

CREATE POLICY "Admins can manage all allocations"
ON public.room_allocations FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Wardens can manage allocations in their hostels"
ON public.room_allocations FOR ALL
USING (
  has_role(auth.uid(), 'warden') AND 
  EXISTS (
    SELECT 1 FROM public.rooms r 
    JOIN public.hostels h ON r.hostel_id = h.id 
    WHERE r.id = room_id AND h.warden_id = auth.uid()
  )
);

-- Add triggers for updated_at
CREATE TRIGGER update_hostels_updated_at
BEFORE UPDATE ON public.hostels
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at
BEFORE UPDATE ON public.inventory
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_allocations_updated_at
BEFORE UPDATE ON public.room_allocations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();