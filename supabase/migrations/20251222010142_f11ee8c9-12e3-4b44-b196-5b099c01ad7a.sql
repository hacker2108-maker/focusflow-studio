-- Create public profiles table for social features
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  total_distance_km NUMERIC DEFAULT 0,
  total_calories INTEGER DEFAULT 0,
  total_activities INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by authenticated users
CREATE POLICY "Profiles are viewable by authenticated users" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', 'User'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create friends/connections table
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  friend_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend connections" 
ON public.friends 
FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can send friend requests" 
ON public.friends 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friend requests they received" 
ON public.friends 
FOR UPDATE 
USING (auth.uid() = friend_id);

CREATE POLICY "Users can delete their own connections" 
ON public.friends 
FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Create workout plans table
CREATE TABLE public.workout_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  category TEXT NOT NULL DEFAULT 'general',
  image_url TEXT,
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  creator_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

-- Public workout plans are viewable by everyone
CREATE POLICY "Public workout plans are viewable" 
ON public.workout_plans 
FOR SELECT 
USING (is_public = true OR auth.uid() = creator_id);

-- Authenticated users can create plans
CREATE POLICY "Users can create workout plans" 
ON public.workout_plans 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Create user workout sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.workout_plans(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" 
ON public.workout_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.workout_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.workout_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Insert some default workout plans
INSERT INTO public.workout_plans (title, description, difficulty, duration_minutes, category, exercises) VALUES
('Morning Energizer', 'Quick 15-minute workout to start your day', 'beginner', 15, 'cardio', '[
  {"name": "Jumping Jacks", "duration": 60, "reps": null, "rest": 15},
  {"name": "High Knees", "duration": 45, "reps": null, "rest": 15},
  {"name": "Burpees", "duration": null, "reps": 10, "rest": 30},
  {"name": "Mountain Climbers", "duration": 45, "reps": null, "rest": 15},
  {"name": "Plank", "duration": 45, "reps": null, "rest": 15},
  {"name": "Squat Jumps", "duration": null, "reps": 15, "rest": 30}
]'::jsonb),
('Core Crusher', 'Intense ab workout for a stronger core', 'intermediate', 20, 'strength', '[
  {"name": "Plank", "duration": 60, "reps": null, "rest": 20},
  {"name": "Bicycle Crunches", "duration": null, "reps": 20, "rest": 15},
  {"name": "Russian Twists", "duration": null, "reps": 30, "rest": 20},
  {"name": "Leg Raises", "duration": null, "reps": 15, "rest": 20},
  {"name": "Mountain Climbers", "duration": 45, "reps": null, "rest": 15},
  {"name": "Dead Bug", "duration": null, "reps": 12, "rest": 15},
  {"name": "Side Plank (each side)", "duration": 30, "reps": null, "rest": 15}
]'::jsonb),
('Full Body HIIT', 'High intensity interval training for maximum burn', 'advanced', 30, 'hiit', '[
  {"name": "Burpees", "duration": null, "reps": 15, "rest": 20},
  {"name": "Jump Squats", "duration": null, "reps": 20, "rest": 20},
  {"name": "Push-ups", "duration": null, "reps": 15, "rest": 20},
  {"name": "Box Jumps", "duration": null, "reps": 12, "rest": 30},
  {"name": "Lunges", "duration": null, "reps": 20, "rest": 20},
  {"name": "Plank to Push-up", "duration": null, "reps": 10, "rest": 30},
  {"name": "Tuck Jumps", "duration": null, "reps": 10, "rest": 30},
  {"name": "Spider-Man Push-ups", "duration": null, "reps": 12, "rest": 20}
]'::jsonb),
('Yoga Flow', 'Relaxing yoga session for flexibility and mindfulness', 'beginner', 25, 'yoga', '[
  {"name": "Child''s Pose", "duration": 60, "reps": null, "rest": 0},
  {"name": "Cat-Cow Stretch", "duration": 60, "reps": null, "rest": 0},
  {"name": "Downward Dog", "duration": 45, "reps": null, "rest": 0},
  {"name": "Warrior I", "duration": 45, "reps": null, "rest": 0},
  {"name": "Warrior II", "duration": 45, "reps": null, "rest": 0},
  {"name": "Triangle Pose", "duration": 45, "reps": null, "rest": 0},
  {"name": "Tree Pose", "duration": 45, "reps": null, "rest": 0},
  {"name": "Seated Forward Fold", "duration": 60, "reps": null, "rest": 0},
  {"name": "Savasana", "duration": 120, "reps": null, "rest": 0}
]'::jsonb),
('Leg Day', 'Build strong legs with this focused workout', 'intermediate', 35, 'strength', '[
  {"name": "Squats", "duration": null, "reps": 15, "rest": 30},
  {"name": "Lunges", "duration": null, "reps": 12, "rest": 20},
  {"name": "Glute Bridges", "duration": null, "reps": 20, "rest": 20},
  {"name": "Wall Sit", "duration": 45, "reps": null, "rest": 30},
  {"name": "Calf Raises", "duration": null, "reps": 25, "rest": 20},
  {"name": "Single Leg Deadlift", "duration": null, "reps": 10, "rest": 30},
  {"name": "Jump Squats", "duration": null, "reps": 15, "rest": 30}
]'::jsonb);