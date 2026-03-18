-- Allow admins and wardens to delete profiles directly
CREATE POLICY "Admins and wardens can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warden'));
