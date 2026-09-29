-- Core, accessory, and recovery exercises removed from the 14-day program.
-- Days 4 and 11 are total rest. sets.exercise_id has no ON DELETE, so sets
-- go first. exercise_notes cascade from exercises.

DELETE FROM public.sets
WHERE exercise_id IN (
  SELECT id FROM public.exercises
  WHERE slug IN (
    'back-extension',
    'bench-reverse-crunches',
    'couch-stretch',
    'deep-squat-hold',
    'garhammer-raises',
    'hanging-leg-raises',
    'heavy-kneeling-cable-crunches',
    'high-to-low-cable-woodchoppers',
    'hollow-body-hold',
    'jefferson-curls',
    'kneeling-ab-wheel-rollouts',
    'l-sit-hold',
    'standing-pallof-press',
    'thoracic-bridge',
    'vacuum-holds',
    'weighted-copenhagen-planks',
    'weighted-decline-sit-ups',
    'weighted-russian-twists',
    'weighted-side-plank',
    'zone-2-cardio'
  )
);

DELETE FROM public.exercises
WHERE slug IN (
  'back-extension',
  'bench-reverse-crunches',
  'couch-stretch',
  'deep-squat-hold',
  'garhammer-raises',
  'hanging-leg-raises',
  'heavy-kneeling-cable-crunches',
  'high-to-low-cable-woodchoppers',
  'hollow-body-hold',
  'jefferson-curls',
  'kneeling-ab-wheel-rollouts',
  'l-sit-hold',
  'standing-pallof-press',
  'thoracic-bridge',
  'vacuum-holds',
  'weighted-copenhagen-planks',
  'weighted-decline-sit-ups',
  'weighted-russian-twists',
  'weighted-side-plank',
  'zone-2-cardio'
);
