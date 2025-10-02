export type Sm2State = {
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
};

export type Sm2Result = {
  next: Sm2State;
  addedDays: number;
};

// grade: 0=Again, 1=Hard, 2=Good, 3=Easy
export function sm2Schedule(prev: Sm2State, grade: 0 | 1 | 2 | 3): Sm2Result {
  let ease = prev.easeFactor;
  const qualityMap = { 0: 1, 1: 3, 2: 4, 3: 5 } as const; // map grades to SM-2 quality scale (1..5)
  const q = qualityMap[grade];

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  let repetitions = prev.repetitions;
  let interval = prev.intervalDays;

  if (q < 3) {
    repetitions = 0;
    interval = 1; // relearn tomorrow
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ease);
  }

  return { next: { repetitions, intervalDays: interval, easeFactor: ease }, addedDays: interval };
}

export const INITIAL_SM2: Sm2State = { repetitions: 0, intervalDays: 0, easeFactor: 2.5 };


