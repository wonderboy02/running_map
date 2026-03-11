BEGIN;
ALTER TABLE public.feedback ADD COLUMN rating SMALLINT;
ALTER TABLE public.feedback ADD CONSTRAINT feedback_rating_range CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.feedback ALTER COLUMN content DROP NOT NULL;
COMMIT;
