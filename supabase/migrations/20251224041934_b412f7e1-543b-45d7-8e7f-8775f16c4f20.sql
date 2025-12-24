-- Fix security issue: Restrict profile visibility to own profile and accepted friends only
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

CREATE POLICY "Users can view own profile or accepted friends profiles"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() = user_id) 
  OR 
  (EXISTS (
    SELECT 1 FROM public.friends 
    WHERE (
      (friends.user_id = auth.uid() AND friends.friend_id = profiles.user_id) 
      OR 
      (friends.friend_id = auth.uid() AND friends.user_id = profiles.user_id)
    ) 
    AND friends.status = 'accepted'
  ))
);

-- Fix security issue: Add missing DELETE policy for workout_plans
CREATE POLICY "Users can delete their own workout plans"
ON public.workout_plans
FOR DELETE
USING (auth.uid() = creator_id);

-- Also add missing UPDATE policy for workout_plans
CREATE POLICY "Users can update their own workout plans"
ON public.workout_plans
FOR UPDATE
USING (auth.uid() = creator_id);