// Starter routine library for the fitness tracker.
// Used by scripts/seed-fitness.mjs. Routines can also be added/edited in the app's Library tab.
//
// Timing convention: "40s" means 40 seconds work then ~20 seconds rest/transition,
// so each move takes about a minute per round.

const m = (name, amount) => ({ name, amount })

function family(familyName, category, equipment, versions) {
  return versions.map((v) => ({
    family: familyName,
    name: `${familyName} (${v.minutes} min)`,
    category,
    equipment,
    ...v,
  }))
}

export const STARTER_ROUTINES = [
  // ---------------- UPPER BODY ----------------
  ...family('Dumbbell Upper Sculpt', 'upper', 'dumbbells', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [
      m('Bicep curls', '40s'), m('Overhead press', '40s'), m('Bent-over rows', '40s'),
      m('Lateral raises (light)', '40s'), m('Tricep kickbacks', '40s'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('Overhead press', '40s'), m('Bent-over rows', '40s'), m('Floor chest press', '40s'),
      m('Hammer curls', '40s'), m('Overhead tricep extension', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'medium', rounds: 3, moves: [
      m('Floor chest press', '12 reps'), m('Single-arm row (each side)', '10 reps'),
      m('Arnold press', '10 reps'), m('Lateral raises', '12 reps'), m('Bicep curls', '12 reps'),
      m('Skull crushers', '12 reps'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),
  ...family('Bodyweight Upper Burner', 'upper', 'none', [
    { minutes: 5, intensity: 'medium', rounds: 1, moves: [
      m('Wall or knee push-ups', '40s'), m('Arm circles (forward/back)', '40s'),
      m('Plank shoulder taps', '40s'), m('Superman pulls', '40s'), m('Chair tricep dips', '40s'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('Push-ups (knees ok)', '40s'), m('Superman pulls', '40s'), m('Chair tricep dips', '40s'),
      m('Plank shoulder taps', '40s'), m('Pike push-ups', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 3, moves: [
      m('Push-ups', '10-15 reps'), m('Pike push-ups', '8-10 reps'), m('Chair tricep dips', '12 reps'),
      m('Reverse snow angels', '12 reps'), m('Plank up-downs', '10 reps'), m('Bear crawl hold', '30 sec'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),

  // ---------------- LOWER BODY ----------------
  ...family('Dumbbell Leg Day', 'lower', 'dumbbells', [
    { minutes: 5, intensity: 'medium', rounds: 1, moves: [
      m('Goblet squats', '40s'), m('Romanian deadlifts', '40s'), m('Reverse lunges (alternating)', '40s'),
      m('Sumo squats', '40s'), m('Calf raises holding weights', '40s'),
    ] },
    { minutes: 10, intensity: 'hard', rounds: 2, moves: [
      m('Goblet squats', '40s'), m('Romanian deadlifts', '40s'), m('Walking or reverse lunges', '40s'),
      m('Weighted glute bridges', '40s'), m('Squat pulses', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 3, moves: [
      m('Goblet squats', '12 reps'), m('Romanian deadlifts', '12 reps'),
      m('Split squats (each leg)', '10 reps'), m('Weighted glute bridges', '15 reps'),
      m('Sumo squats', '12 reps'), m('Calf raises', '20 reps'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),
  ...family('Bodyweight Legs & Glutes', 'lower', 'none', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [
      m('Bodyweight squats', '40s'), m('Glute bridges', '40s'), m('Standing side leg raises', '40s'),
      m('Reverse lunges (alternating)', '40s'), m('Calf raises', '40s'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('Squats', '40s'), m('Reverse lunges', '40s'), m('Single-leg glute bridges (switch halfway)', '40s'),
      m('Wall sit', '40s'), m('Donkey kicks (switch halfway)', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 3, moves: [
      m('Jump squats (or fast squats)', '15 reps'), m('Bulgarian split squats on a chair (each leg)', '10 reps'),
      m('Single-leg glute bridges (each leg)', '12 reps'), m('Curtsy lunges (each side)', '10 reps'),
      m('Wall sit', '45 sec'), m('Calf raises', '25 reps'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),

  // ---------------- CORE ----------------
  ...family('Dumbbell Core Crusher', 'core', 'dumbbells', [
    { minutes: 5, intensity: 'medium', rounds: 1, moves: [
      m('Weighted dead bugs', '40s'), m('Russian twists with dumbbell', '40s'), m('Plank hold', '40s'),
      m('Suitcase hold (switch halfway)', '40s'), m('Weighted crunches', '40s'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('Weighted dead bugs', '40s'), m('Russian twists', '40s'), m('Renegade rows', '40s'),
      m('Side bends (switch halfway)', '40s'), m('Weighted sit-ups', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 3, moves: [
      m('Renegade rows', '10 reps'), m('Weighted sit-ups', '12 reps'), m('Russian twists', '20 reps'),
      m('Dumbbell woodchops (each side)', '10 reps'), m('Weighted dead bugs', '12 reps'),
      m('Plank pull-through', '10 reps'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),
  ...family('Bodyweight Core Blast', 'core', 'none', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [
      m('Dead bugs', '40s'), m('Bird dogs', '40s'), m('Forearm plank (knees ok)', '40s'),
      m('Heel taps', '40s'), m('Glute bridge hold', '40s'),
    ] },
    { minutes: 10, intensity: 'easy', rounds: 2, moves: [
      m('Dead bugs', '40s'), m('Bicycle crunches (slow)', '40s'), m('Side plank (switch halfway)', '40s'),
      m('Bird dogs', '40s'), m('Forearm plank', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'medium', rounds: 3, moves: [
      m('Bicycle crunches', '20 reps'), m('Mountain climbers', '30 sec'), m('Side plank (each side)', '30 sec'),
      m('Leg raises', '12 reps'), m('Plank jacks', '20 reps'), m('Hollow body hold', '20 sec'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),

  // ---------------- FULL BODY ----------------
  ...family('Dumbbell Full Body Basics', 'full', 'dumbbells', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [
      m('Squat to press (light)', '40s'), m('Bent-over rows', '40s'), m('Reverse lunge + curl', '40s'),
      m('Glute bridge + chest press', '40s'), m('Standing march holding weights', '40s'),
    ] },
    { minutes: 10, intensity: 'easy', rounds: 2, moves: [
      m('Goblet squats', '40s'), m('Bent-over rows', '40s'), m('Overhead press', '40s'),
      m('Romanian deadlifts', '40s'), m('Farmer carry / march', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'medium', rounds: 3, moves: [
      m('Goblet squats', '12 reps'), m('Single-arm rows (each side)', '10 reps'),
      m('Reverse lunge + curl (each leg)', '8 reps'), m('Floor chest press', '12 reps'),
      m('Romanian deadlifts', '12 reps'), m('Dead bugs', '12 reps'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),
  ...family('Dumbbell HIIT Inferno', 'full', 'dumbbells', [
    { minutes: 5, intensity: 'hard', rounds: 1, moves: [
      m('Dumbbell thrusters', '40s'), m('Renegade rows', '40s'), m('Squat jumps (no weights)', '40s'),
      m('Dumbbell swings', '40s'), m('Man-makers (slow ok)', '40s'),
    ] },
    { minutes: 10, intensity: 'hard', rounds: 2, moves: [
      m('Dumbbell thrusters', '40s'), m('Renegade rows', '40s'), m('Dumbbell swings', '40s'),
      m('Lunge + press (alternating)', '40s'), m('Burpees (step-back ok)', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 4, moves: [
      m('Dumbbell thrusters', '12 reps'), m('Renegade rows', '10 reps'), m('Dumbbell swings', '15 reps'),
      m('Lunge + press (each leg)', '8 reps'), m('Burpees', '8 reps'),
    ], notes: 'Rest 45 sec between rounds.' },
  ]),
  ...family('Bodyweight Full Body Flow', 'full', 'none', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [
      m('Squat + reach up', '40s'), m('Inchworm walkouts', '40s'), m('Reverse lunges', '40s'),
      m('Cat-cow to plank', '40s'), m('Glute bridges', '40s'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('Squats', '40s'), m('Push-ups (knees ok)', '40s'), m('Reverse lunges', '40s'),
      m('Superman pulls', '40s'), m('Mountain climbers (slow)', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'medium', rounds: 3, moves: [
      m('Squats', '15 reps'), m('Push-ups', '10 reps'), m('Reverse lunges (each leg)', '10 reps'),
      m('Inchworm walkouts', '6 reps'), m('Glute bridges', '15 reps'), m('Plank', '40 sec'),
    ], notes: 'Rest 1 min between rounds.' },
  ]),
  ...family('Bodyweight Sweat Circuit', 'full', 'none', [
    { minutes: 5, intensity: 'hard', rounds: 1, moves: [
      m('Jumping jacks', '40s'), m('Burpees (step-back ok)', '40s'), m('Jump squats', '40s'),
      m('Mountain climbers', '40s'), m('High knees', '40s'),
    ] },
    { minutes: 10, intensity: 'hard', rounds: 2, moves: [
      m('Burpees', '40s'), m('Jump lunges (or fast lunges)', '40s'), m('Push-ups', '40s'),
      m('Skaters', '40s'), m('Mountain climbers', '40s'),
    ], notes: 'Rest 30 sec between rounds.' },
    { minutes: 20, intensity: 'hard', rounds: 4, moves: [
      m('Burpees', '10 reps'), m('Jump squats', '15 reps'), m('Push-ups', '12 reps'),
      m('Skaters', '20 reps'), m('Mountain climbers', '30 reps'),
    ], notes: 'Rest 45 sec between rounds.' },
  ]),

  // ---------------- CARDIO (no equipment, shown to everyone) ----------------
  ...family('Easy Walk', 'cardio', 'none', [
    { minutes: 5, intensity: 'easy', rounds: 1, moves: [m('Comfortable walk', '5 min')] },
    { minutes: 10, intensity: 'easy', rounds: 1, moves: [m('Comfortable walk', '10 min')] },
    { minutes: 20, intensity: 'easy', rounds: 1, moves: [m('Comfortable walk', '18 min'), m('Calf + hamstring stretch', '2 min')] },
  ]),
  ...family('Brisk Walk', 'cardio', 'none', [
    { minutes: 5, intensity: 'medium', rounds: 1, moves: [m('Easy warm-up walk', '1 min'), m('Brisk walk (can talk, not sing)', '4 min')] },
    { minutes: 10, intensity: 'medium', rounds: 1, moves: [m('Easy warm-up walk', '2 min'), m('Brisk walk', '7 min'), m('Cool-down walk', '1 min')] },
    { minutes: 20, intensity: 'medium', rounds: 1, moves: [
      m('Easy warm-up walk', '3 min'), m('Brisk walk', '8 min'), m('Power walk with arm swing', '6 min'), m('Cool-down walk', '3 min'),
    ] },
  ]),
  ...family('Walk/Run Intervals', 'cardio', 'none', [
    { minutes: 5, intensity: 'hard', rounds: 3, moves: [m('Easy walk warm-up (first round only)', '1 min'), m('Jog / run', '30 sec'), m('Brisk walk', '30 sec')] },
    { minutes: 10, intensity: 'hard', rounds: 6, moves: [m('Warm-up walk (first round only)', '2 min'), m('Jog / run', '45 sec'), m('Brisk walk', '45 sec')] },
    { minutes: 20, intensity: 'hard', rounds: 8, moves: [
      m('Warm-up walk (first round only)', '3 min'), m('Jog / run', '1 min'), m('Brisk walk', '1 min'), m('Cool-down walk (after last round)', '1 min'),
    ] },
  ]),
  ...family('Indoor Cardio Mix', 'cardio', 'none', [
    { minutes: 5, intensity: 'medium', rounds: 1, moves: [
      m('March in place', '1 min'), m('Step jacks', '1 min'), m('Side steps with arm reach', '1 min'), m('Butt kicks', '1 min'), m('Knee lifts', '1 min'),
    ] },
    { minutes: 10, intensity: 'medium', rounds: 2, moves: [
      m('March in place', '1 min'), m('Jumping jacks (step-out ok)', '1 min'), m('Grapevines', '1 min'), m('High knees', '1 min'), m('Boxer shuffle + punches', '1 min'),
    ] },
    { minutes: 20, intensity: 'hard', rounds: 3, moves: [
      m('Jumping jacks', '1 min'), m('High knees', '1 min'), m('Skaters', '1 min'), m('Boxer shuffle + punches', '1 min'),
      m('Fast feet', '1 min'), m('March to recover', '1 min'),
    ], notes: 'Recover 30 sec between rounds.' },
  ]),
]
