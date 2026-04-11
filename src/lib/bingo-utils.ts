// ============================================================
// Bingo Utils — Multi-grid board generation & win checking
// Supports: 5x5, 3x9 (Indian Housie), 9x10
// ============================================================

export type TicketSize = "5x5" | "3x9" | "9x10"

export interface BingoItem {
  id: string
  value: string
  imageUrl?: string
  dialogueText?: string
  hintText?: string
  movieName?: string
}

export interface BoardCell {
  id: string
  item: BingoItem
  isFree: boolean
  row: number
  col: number
  isEmpty?: boolean // For 3x9 grids where some cells are blank
}

export interface WinningLine {
  type: "row" | "column" | "diagonal" | "full_house"
  index?: number
  cells: BoardCell[]
}

export interface GridConfig {
  rows: number
  cols: number
  totalCells: number
  filledCells: number // Cells that actually have numbers
  hasFreeCenter: boolean
  hasEmptyCells: boolean // 3x9 has blank cells
}

// ============================================================
// Grid Configuration
// ============================================================

export function getGridConfig(ticketSize: TicketSize): GridConfig {
  switch (ticketSize) {
    case "5x5":
      return { rows: 5, cols: 5, totalCells: 25, filledCells: 24, hasFreeCenter: true, hasEmptyCells: false }
    case "3x9":
      // Indian Housie: 3 rows × 9 columns, each row has exactly 5 numbers (4 blanks)
      return { rows: 3, cols: 9, totalCells: 27, filledCells: 15, hasFreeCenter: false, hasEmptyCells: true }
    case "9x10":
      return { rows: 9, cols: 10, totalCells: 90, filledCells: 90, hasFreeCenter: false, hasEmptyCells: false }
    default:
      return { rows: 5, cols: 5, totalCells: 25, filledCells: 24, hasFreeCenter: true, hasEmptyCells: false }
  }
}

// ============================================================
// Board Generation
// ============================================================

export function generateBingoBoard(items: BingoItem[], ticketSize: TicketSize = "5x5"): BoardCell[] {
  const config = getGridConfig(ticketSize)

  switch (ticketSize) {
    case "5x5":
      return generate5x5Board(items)
    case "3x9":
      return generate3x9Board(items)
    case "9x10":
      return generate9x10Board(items)
    default:
      return generate5x5Board(items)
  }
}

function generate5x5Board(items: BingoItem[]): BoardCell[] {
  const board: BoardCell[] = []
  let itemIndex = 0

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const isFree = row === 2 && col === 2

      if (isFree) {
        board.push({
          id: `cell-${row}-${col}`,
          item: { id: "free", value: "FREE" },
          isFree: true,
          row,
          col,
        })
      } else if (itemIndex < items.length) {
        board.push({
          id: `cell-${row}-${col}`,
          item: items[itemIndex],
          isFree: false,
          row,
          col,
        })
        itemIndex++
      }
    }
  }

  return board
}

function generate3x9Board(items: BingoItem[]): BoardCell[] {
  // Indian Housie: 3 rows, 9 columns
  // Each row has exactly 5 numbers placed in specific columns
  // Numbers are sorted within columns (col 0: 1-9, col 1: 10-19, etc.)
  const board: BoardCell[] = []
  let itemIndex = 0

  for (let row = 0; row < 3; row++) {
    // Pick 5 random column positions for this row
    const allCols = [0, 1, 2, 3, 4, 5, 6, 7, 8]
    const filledCols = new Set<number>()
    while (filledCols.size < 5) {
      const randIdx = Math.floor(Math.random() * allCols.length)
      filledCols.add(allCols[randIdx])
    }

    for (let col = 0; col < 9; col++) {
      if (filledCols.has(col) && itemIndex < items.length) {
        board.push({
          id: `cell-${row}-${col}`,
          item: items[itemIndex],
          isFree: false,
          isEmpty: false,
          row,
          col,
        })
        itemIndex++
      } else {
        board.push({
          id: `cell-${row}-${col}`,
          item: { id: `empty-${row}-${col}`, value: "" },
          isFree: false,
          isEmpty: true,
          row,
          col,
        })
      }
    }
  }

  return board
}

function generate9x10Board(items: BingoItem[]): BoardCell[] {
  const board: BoardCell[] = []
  let itemIndex = 0

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 10; col++) {
      if (itemIndex < items.length) {
        board.push({
          id: `cell-${row}-${col}`,
          item: items[itemIndex],
          isFree: false,
          row,
          col,
        })
        itemIndex++
      }
    }
  }

  return board
}

// ============================================================
// Win Checking
// ============================================================

export function checkBingo(
  board: BoardCell[],
  markedItemIds: Set<string>,
  ticketSize: TicketSize = "5x5"
): WinningLine[] {
  const config = getGridConfig(ticketSize)
  const winningLines: WinningLine[] = []

  // Check rows
  for (let row = 0; row < config.rows; row++) {
    const rowCells = board.filter((c) => c.row === row && !c.isEmpty)
    if (rowCells.length > 0) {
      const allMarked = rowCells.every(
        (c) => c.isFree || markedItemIds.has(c.item.id)
      )
      if (allMarked) {
        winningLines.push({ type: "row", index: row, cells: rowCells })
      }
    }
  }

  // Check columns
  for (let col = 0; col < config.cols; col++) {
    const colCells = board.filter((c) => c.col === col && !c.isEmpty)
    if (colCells.length > 0) {
      const allMarked = colCells.every(
        (c) => c.isFree || markedItemIds.has(c.item.id)
      )
      if (allMarked) {
        winningLines.push({ type: "column", index: col, cells: colCells })
      }
    }
  }

  // Check diagonals (only for square grids like 5x5)
  if (ticketSize === "5x5") {
    const mainDiagonal = board.filter((c) => c.row === c.col)
    if (mainDiagonal.every((c) => c.isFree || markedItemIds.has(c.item.id))) {
      winningLines.push({ type: "diagonal", cells: mainDiagonal })
    }

    const antiDiagonal = board.filter((c) => c.row + c.col === 4)
    if (antiDiagonal.every((c) => c.isFree || markedItemIds.has(c.item.id))) {
      winningLines.push({ type: "diagonal", cells: antiDiagonal })
    }
  }

  // Check full house
  const allFilledCells = board.filter((c) => !c.isEmpty)
  const allMarked = allFilledCells.every(
    (c) => c.isFree || markedItemIds.has(c.item.id)
  )
  if (allMarked) {
    winningLines.push({ type: "full_house", cells: allFilledCells })
  }

  return winningLines
}

export function getRowProgress(
  board: BoardCell[],
  markedItemIds: Set<string>,
  ticketSize: TicketSize = "5x5"
): number[] {
  const config = getGridConfig(ticketSize)
  const completedRows: number[] = []

  for (let row = 0; row < config.rows; row++) {
    const rowCells = board.filter((c) => c.row === row && !c.isEmpty)
    if (rowCells.length > 0) {
      const allMarked = rowCells.every(
        (c) => c.isFree || markedItemIds.has(c.item.id)
      )
      if (allMarked) completedRows.push(row)
    }
  }

  return completedRows
}

// ============================================================
// Number Pool Generation
// ============================================================

export function generateNumberPool(range: number): string[] {
  const numbers: string[] = []
  for (let i = 1; i <= range; i++) {
    numbers.push(i.toString())
  }
  return shuffleArray(numbers)
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
