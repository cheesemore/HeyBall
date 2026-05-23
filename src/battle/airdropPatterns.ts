import { BLOCK_COLS } from '../config/gameBalance';
import { AIRDROP_MAX_ROW, AIRDROP_MIN_ROW } from '../config/airdrop';

export interface AirDropCell {
  row: number;
  col: number;
}

/** 相对锚点的形状（dr, dc） */
export interface AirDropPattern {
  id: string;
  cells: { dr: number; dc: number }[];
}

/** 口、M、W、山、十字、箭头等（均在 3–7 行区域内可放置） */
export const BLUE_AIRDROP_PATTERNS: AirDropPattern[] = [
  {
    id: '口',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 0, dc: 1 },
      { dr: 0, dc: 2 },
      { dr: 0, dc: 3 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 3 },
      { dr: 2, dc: 0 },
      { dr: 2, dc: 3 },
      { dr: 3, dc: 0 },
      { dr: 3, dc: 1 },
      { dr: 3, dc: 2 },
      { dr: 3, dc: 3 },
    ],
  },
  {
    id: 'M',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 0, dc: 3 },
      { dr: 0, dc: 6 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: 3 },
      { dr: 1, dc: 4 },
      { dr: 1, dc: 6 },
      { dr: 2, dc: 0 },
      { dr: 2, dc: 2 },
      { dr: 2, dc: 4 },
      { dr: 2, dc: 6 },
      { dr: 3, dc: 0 },
      { dr: 3, dc: 3 },
      { dr: 3, dc: 6 },
      { dr: 4, dc: 0 },
      { dr: 4, dc: 6 },
    ],
  },
  {
    id: 'W',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 0, dc: 4 },
      { dr: 0, dc: 7 },
      { dr: 1, dc: 0 },
      { dr: 1, dc: 4 },
      { dr: 1, dc: 7 },
      { dr: 2, dc: 0 },
      { dr: 2, dc: 2 },
      { dr: 2, dc: 4 },
      { dr: 2, dc: 6 },
      { dr: 2, dc: 7 },
      { dr: 3, dc: 0 },
      { dr: 3, dc: 1 },
      { dr: 3, dc: 3 },
      { dr: 3, dc: 5 },
      { dr: 3, dc: 6 },
      { dr: 3, dc: 7 },
      { dr: 4, dc: 2 },
      { dr: 4, dc: 5 },
    ],
  },
  {
    id: '山',
    cells: [
      { dr: 0, dc: 3 },
      { dr: 1, dc: 2 },
      { dr: 1, dc: 4 },
      { dr: 2, dc: 1 },
      { dr: 2, dc: 5 },
      { dr: 3, dc: 0 },
      { dr: 3, dc: 6 },
      { dr: 4, dc: 0 },
      { dr: 4, dc: 1 },
      { dr: 4, dc: 2 },
      { dr: 4, dc: 3 },
      { dr: 4, dc: 4 },
      { dr: 4, dc: 5 },
      { dr: 4, dc: 6 },
    ],
  },
  {
    id: '十字',
    cells: [
      { dr: 0, dc: 3 },
      { dr: 1, dc: 3 },
      { dr: 2, dc: 1 },
      { dr: 2, dc: 2 },
      { dr: 2, dc: 3 },
      { dr: 2, dc: 4 },
      { dr: 2, dc: 5 },
      { dr: 3, dc: 3 },
      { dr: 4, dc: 3 },
    ],
  },
  {
    id: '箭',
    cells: [
      { dr: 0, dc: 3 },
      { dr: 1, dc: 2 },
      { dr: 1, dc: 3 },
      { dr: 1, dc: 4 },
      { dr: 2, dc: 1 },
      { dr: 2, dc: 3 },
      { dr: 2, dc: 5 },
      { dr: 3, dc: 0 },
      { dr: 3, dc: 3 },
      { dr: 3, dc: 7 },
      { dr: 4, dc: 0 },
      { dr: 4, dc: 7 },
    ],
  },
  {
    id: '梯',
    cells: [
      { dr: 0, dc: 0 },
      { dr: 0, dc: 1 },
      { dr: 1, dc: 1 },
      { dr: 1, dc: 2 },
      { dr: 2, dc: 2 },
      { dr: 2, dc: 3 },
      { dr: 3, dc: 3 },
      { dr: 3, dc: 4 },
      { dr: 4, dc: 4 },
      { dr: 4, dc: 5 },
    ],
  },
];

export function patternFitsAtAnchor(
  pattern: AirDropPattern,
  anchorRow: number,
  anchorCol: number,
): boolean {
  for (const { dr, dc } of pattern.cells) {
    const r = anchorRow + dr;
    const c = anchorCol + dc;
    if (r < AIRDROP_MIN_ROW || r > AIRDROP_MAX_ROW) return false;
    if (c < 0 || c >= BLOCK_COLS) return false;
  }
  return true;
}

export function patternToCells(
  pattern: AirDropPattern,
  anchorRow: number,
  anchorCol: number,
): AirDropCell[] {
  return pattern.cells.map(({ dr, dc }) => ({
    row: anchorRow + dr,
    col: anchorCol + dc,
  }));
}

export function listValidAnchors(pattern: AirDropPattern): { row: number; col: number }[] {
  const anchors: { row: number; col: number }[] = [];
  for (let r = AIRDROP_MIN_ROW; r <= AIRDROP_MAX_ROW; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      if (patternFitsAtAnchor(pattern, r, c)) anchors.push({ row: r, col: c });
    }
  }
  return anchors;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

export function pickBluePatternCells(): AirDropCell[] {
  const patterns = [...BLUE_AIRDROP_PATTERNS];
  shuffle(patterns);

  for (const pattern of patterns) {
    const anchors = listValidAnchors(pattern);
    shuffle(anchors);
    for (const anchor of anchors) {
      const cells = patternToCells(pattern, anchor.row, anchor.col);
      return cells;
    }
  }

  const fallback: AirDropCell[] = [];
  for (let r = AIRDROP_MIN_ROW; r <= AIRDROP_MAX_ROW; r++) {
    for (let c = 0; c < BLOCK_COLS; c++) {
      if (Math.random() < 0.45) fallback.push({ row: r, col: c });
    }
  }
  return fallback.length > 0 ? fallback : [{ row: 4, col: 3 }];
}
