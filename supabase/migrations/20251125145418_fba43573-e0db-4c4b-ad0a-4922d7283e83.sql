-- Create a trigger to automatically assign admin role for specific email
CREATE OR REPLACE FUNCTION public.assign_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user's email matches the admin email
  IF NEW.email = 'harinigompa976@gmail.com' THEN
    -- Insert admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users to assign admin role
DROP TRIGGER IF EXISTS on_auth_user_admin_assign ON auth.users;
CREATE TRIGGER on_auth_user_admin_assign
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role();

-- Add consent column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS contact_consent boolean DEFAULT false;