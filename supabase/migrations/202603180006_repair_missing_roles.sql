-- Repair migration: Assign 'student' role to all existing users who don't have a role yet
-- Unless there are no admins, in which case the first one found gets 'admin'.

DO $$
DECLARE
    user_record RECORD;
    admin_exists BOOLEAN;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;

    -- Loop through users in auth.users
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- If user doesn't have any role
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = user_record.id) THEN
            IF NOT admin_exists THEN
                INSERT INTO public.user_roles (user_id, role) VALUES (user_record.id, 'admin');
                admin_exists := TRUE;
            ELSE
                INSERT INTO public.user_roles (user_id, role) VALUES (user_record.id, 'student');
            END IF;
        END IF;
    END LOOP;
END $$;
