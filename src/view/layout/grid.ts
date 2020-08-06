/**
 * @file Packing algorithm that lays out nodes in a grid so that they are all as
 * close to the center as possible, but not overlapping.
 */

interface Rect {
  w: number;
  h: number;
}

interface PlacedRect extends Rect {
  x: number;
  y: number;
}

/**
 * A range of rows or columns that partially defines a range of cells.
 */
interface LinearRange {
  start: number;
  end: number;
  size: number;
  offset: number;
}

/**
 * A range of rows and of columns that defines a 2D range of cells.
 */
interface AreaRange { 
  row: LinearRange; 
  col: LinearRange;
}

let rows: number[];
let cols: number[];
let cells: boolean[][];

/**
 * Places rectangles in a bounding box so that they do not overlap and are as
 * close to the center as possible.
 *
 * @param bounds The bounding box to place the rectangles inside of.
 * @param rectsToPlace The rectangles to place in the bounding box.
 * @param rectsToAvoid Rectangles that are already in the bounding box that
 * cannot be moved or overlapped.
 */
export function placeRects(
  bounds: Rect, 
  rectsToPlace: Rect[], 
  rectsToAvoid: PlacedRect[] = []): Map<Rect, PlacedRect> {
  // place rects with largest area first
  rectsToPlace.sort((r1, r2) => r2.w * r2.h - r1.w * r1.h);

  const placedRects = new Map<Rect, PlacedRect>();

  const boundsCenterX = bounds.w / 2;
  const boundsCenterY = bounds.h / 2;

  rows = [bounds.h];
  cols = [bounds.w];
  cells = [[false]];

  for (const placedRect of rectsToAvoid) {
    const area = getOverlappingArea(rows, cols, placedRect);

    subdivideCells(
      area, placedRect, rows, cols, cells
    );
  }
  
  for (const rect of rectsToPlace) {
    // find contiguous chunks of rows that are as small as possible
    // while being able to contain this rect's height

    const potentialRowChunks = getPotentialRanges(rows, rect.h);
    const potentialColChunks = getPotentialRanges(cols, rect.w);

    // locate the range of cells that is completely empty and is closest to the
    // center of the bounding box
    const area = getBestArea(
      cells, 
      potentialRowChunks, 
      potentialColChunks,
      boundsCenterX,
      boundsCenterY);
    
    console.log(area, potentialRowChunks, potentialColChunks);

    if (!area) {
      // no more cell chunks found, exit
      break;
    }

    const placedRect = placeRectInArea(
      area, rect, boundsCenterX, boundsCenterY 
    );

    subdivideCells(
      area, placedRect, rows, cols, cells
    );
    
    placedRects.set(rect, placedRect);
  }

  return placedRects;
}

function getPotentialRanges(segments: number[], size: number): LinearRange[] {
  const chunks: LinearRange[] = [];
  let currentChunk: number[] = [];
  let currentSize = 0;
  let currentOffset = 0;
  let start = 0;
  let end = 0;

  while (start <= end) {
    while (end < segments.length && currentSize < size) {
      const newSegment = segments[end];
      currentChunk.push(newSegment);
      currentSize += newSegment;
      end++;
    }

    chunks.push({
      start, 
      end,
      offset: currentOffset,
      size: currentSize,
    });

    currentSize -= currentChunk[0];
    currentOffset += currentChunk[0];
    currentChunk = currentChunk.slice(1);
    start++;
  }

  return chunks;
}

function getOverlappingArea(
  rows: number[], 
  cols: number[], 
  rect: PlacedRect
): AreaRange {
  let x = 0;
  let y = 0;
  let w = 0;
  let h = 0;
  let i = 0;

  // iterate until we would cross left edge of rect
  while (x + cols[i] <= rect.x) {
    x += cols[i];
    i++;
  }

  const firstCol = i;

  // iterate until we would do right edge of rect
  while (x + w < rect.x + rect.w) {
    w += cols[i];
    i++; 
  } 

  const lastCol = i;

  i = 0;
    
  // iterate until we would cross top edge of rect
  while (y + rows[i] <= rect.y) {
    y += rows[i];
    i++; 
  }
    
  const firstRow = i;

  // iterate until we do cross bottom edge of rect
  while (y + h < rect.y + rect.h) {
    h += rows[i];
    i++; 
  } 

  const lastRow = i;

  return {
    row: {
      start: firstRow,
      end: lastRow,
      size: h,
      offset: y,
    },
    col: {
      start: firstCol,
      end: lastCol,
      size: w,
      offset: x,
    },
  };
}

function getBestArea(
  cells: boolean[][], 
  potentialRowChunks: LinearRange[], 
  potentialColChunks: LinearRange[],
  boundsCenterX: number,
  boundsCenterY: number) {
  let cellChunk = null;

  for (const potentialRowChunk of potentialRowChunks) {
    for (const potentialColChunk of potentialColChunks) {
      // first check if any of the cells in this chunk are taken already
      let empty = true;

      for (let row = potentialRowChunk.start; row < potentialRowChunk.end; row++) {
        for (let col = potentialColChunk.start; col < potentialColChunk.end; col++) {
          if (cells[row][col]) {
            empty = false;
            break;
          }
        }

        if (!empty) break;
      }

      if (!empty) continue;

      const chunkCenterX = potentialColChunk.offset + potentialColChunk.size / 2;
      const chunkCenterY = potentialRowChunk.offset + potentialRowChunk.size / 2;
      const chunkCenterDistance = Math.sqrt(
        (chunkCenterX - boundsCenterX) ** 2 + (chunkCenterY - boundsCenterY) ** 2
      );

      if (cellChunk === null || cellChunk.dist > chunkCenterDistance) {
        cellChunk = {
          col: potentialColChunk,
          row: potentialRowChunk,
          dist: chunkCenterDistance, 
        }; 
      }
    }
  }

  return cellChunk;
}

function placeRectInArea(
  area: AreaRange,
  rect: Rect,
  boundsCenterX: number,
  boundsCenterY: number
): PlacedRect {
  const { min, max } = Math;
  const areaX = area.col.offset;
  const areaW = area.col.size;
  const areaY = area.row.offset;
  const areaH = area.row.size;

  // get x and y within cell chunk
  const x = max(areaX, min(areaX + areaW - rect.w, boundsCenterX - rect.w / 2));
  const y = max(areaY, min(areaY + areaH - rect.h, boundsCenterY - rect.h / 2));

  return {
    x,
    y,
    w: rect.w,
    h: rect.h,
  };
}

function subdivideCells(
  area: AreaRange, 
  rect: PlacedRect, 
  rows: number[], 
  cols: number[],
  cells: boolean[][], 
) {
  const {
    x, y, w, h, 
  } = rect;
  
  const areaX = area.col.offset;
  const areaW = area.col.size;
  const areaY = area.row.offset;
  const areaH = area.row.size;
  
  const spaceOnLeft = x - areaX;
  const spaceOnTop = y - areaY;
  const spaceOnRight = (areaX + areaW) - (x + w);
  const spaceOnBottom = (areaY + areaH) - (y + h);

  let firstCol = area.col.start;
  let lastCol = area.col.end - 1;

  let firstRow = area.row.start;
  let lastRow = area.row.end - 1;

  if (spaceOnBottom > 0) {
    rows.splice(lastRow, 1, rows[lastRow] - spaceOnBottom, spaceOnBottom);
    cells.splice(lastRow, 0, [...cells[lastRow]]);
  }

  if (spaceOnTop > 0) {
    rows.splice(firstRow, 1, spaceOnTop, rows[firstRow] - spaceOnTop);
    cells.splice(firstRow, 0, [...cells[firstRow]]);
    firstRow += 1;
    lastRow += 1;
  }

  if (spaceOnRight > 0) {
    cols.splice(lastCol, 1, cols[lastCol] - spaceOnRight, spaceOnRight);
    for (const row of cells) {
      row.splice(lastCol, 0, row[lastCol]);
    }
  }

  if (spaceOnLeft > 0) {
    cols.splice(firstCol, 1, spaceOnLeft, cols[firstCol] - spaceOnLeft);
    for (const row of cells) {
      row.splice(firstCol, 0, row[firstCol]);
    }

    firstCol += 1;
    lastCol += 1;
  }

  for (let col = firstCol; col <= lastCol; col++) {
    for (let row = firstRow; row <= lastRow; row++) {
      cells[row][col] = true;
    }
  }
}
