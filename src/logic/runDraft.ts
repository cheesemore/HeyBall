import { ALL_BALL_COLORS, type BallColor } from '../ballTypes';
import { DRAFT_OPTION_SIZE } from '../config/ballCatalog';

export interface RunDraftState {
  options: BallColor[][];
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

function pickRandomColors(n: number): BallColor[] {
  const pool = [...ALL_BALL_COLORS];
  shuffle(pool);
  return pool.slice(0, n);
}

export function createRunDraft(): RunDraftState {
  return {
    options: [
      pickRandomColors(DRAFT_OPTION_SIZE),
      pickRandomColors(DRAFT_OPTION_SIZE),
      pickRandomColors(DRAFT_OPTION_SIZE),
    ],
  };
}
