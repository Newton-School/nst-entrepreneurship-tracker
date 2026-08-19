-- Add roll_no to user_roles and update trigger to capture raw_user_meta_data

ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS roll_no TEXT;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles(user_id, role, roll_no)
  VALUES (NEW.id, 'student', NEW.raw_user_meta_data->>'roll_no')
  ON CONFLICT (user_id, role) DO UPDATE SET roll_no = EXCLUDED.roll_no;
  RETURN NEW;
END;
$function$;
