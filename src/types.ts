export type DifficultyRating = 'easy' | 'medium' | 'hard';

export type Session = {
  id: string;
  task: string;
  startAt: string;
  splitAt?: string;
  endAt?: string;
  part1Rating?: DifficultyRating;
  part2Rating?: DifficultyRating;
  note?: string;
};

export type AppStep =
  | 'start'
  | 'part1'
  | 'rate1'
  | 'break'
  | 'part2'
  | 'rate2'
  | 'summary';
