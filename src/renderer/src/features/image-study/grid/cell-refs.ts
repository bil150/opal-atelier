/**
 * Cells are named like chessboard squares: column in letters (A…Z, AA…), row in numbers (A1, B1, A2…),
 * counted from the top-left corner.
 */

/** 0 → A, 25 → Z, 26 → AA… */
export function columnLabel(column: number): string {
  let s = ''
  for (let c = column + 1; c > 0; c = Math.floor((c - 1) / 26))
    s = String.fromCharCode(65 + ((c - 1) % 26)) + s
  return s
}

/** A → 0, AA → 26… */
export function columnIndex(letters: string): number {
  let n = 0
  for (const ch of letters) n = n * 26 + ch.charCodeAt(0) - 64
  return n - 1
}

export function cellName(column: number, row: number): string {
  return `${columnLabel(column)}${row + 1}`
}

/** "column,row" key of a cell in a selection set. */
export type CellKey = `${number},${number}`

export function cellKey(column: number, row: number): CellKey {
  return `${column},${row}`
}

export function parseCellKey(key: CellKey): readonly [number, number] {
  const [c, r] = key.split(',').map(Number)
  return [c ?? 0, r ?? 0]
}

/** Selected cells sorted by row, then column. */
export function sortedCells(selection: ReadonlySet<CellKey>): (readonly [number, number])[] {
  return [...selection].map(parseCellKey).sort((a, b) => a[1] - b[1] || a[0] - b[0])
}

export interface ParsedRefs {
  readonly cells: Set<CellKey>
  /** References that don't exist on this grid or can't be read. */
  readonly rejected: readonly string[]
}

/** "A1, B2" → cells; blocks like "A1:C2" too. Case and separators (comma, semicolon, spaces) are free. */
export function parseCellRefs(text: string, columns: number, rows: number): ParsedRefs {
  const cells = new Set<CellKey>()
  const rejected: string[] = []
  for (const token of text
    .toUpperCase()
    .split(/[\s,;]+/)
    .filter(Boolean)) {
    const m = /^([A-Z]{1,2})(\d{1,4})(?::([A-Z]{1,2})(\d{1,4}))?$/.exec(token)
    if (!m) {
      rejected.push(token)
      continue
    }
    const [, colA = '', rowA = '', colB, rowB] = m
    const c0 = columnIndex(colA)
    const r0 = Number(rowA) - 1
    const c1 = colB ? columnIndex(colB) : c0
    const r1 = rowB ? Number(rowB) - 1 : r0
    const [ca, cb] = [Math.min(c0, c1), Math.max(c0, c1)]
    const [ra, rb] = [Math.min(r0, r1), Math.max(r0, r1)]
    if (ca < 0 || ra < 0 || cb >= columns || rb >= rows) {
      rejected.push(token)
      continue
    }
    for (let r = ra; r <= rb; r++) for (let c = ca; c <= cb; c++) cells.add(cellKey(c, r))
  }
  return { cells, rejected }
}
