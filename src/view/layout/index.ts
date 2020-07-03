interface Rect {
  w: number;
  h: number;
}

interface PlacedRect extends Rect {
  x: number;
  y: number;
}

interface Chunk {
  start: number;
  end: number;
  size: number;
  offset: number;
}

function findChunks(segments: number[], size: number): Chunk[] {
  const chunks: Chunk[] = [];
  let currentChunk: number[] = [];
  let currentSize = 0;
  let currentOffset = 0;
  let start = 0;
  let end = 0;

  while (end < segments.length) {
    while (end < segments.length && currentSize < size) {
      const newSegment = segments[end++];
      currentChunk.push(newSegment);
      currentSize += newSegment;
    }

    chunks.push({
      start, 
      end,
      offset: currentOffset,
      size: currentSize
    });

    start++;
    currentSize -= currentChunk[0];
    currentOffset += currentChunk[0];
    currentChunk = currentChunk.slice(1);
  }

  return chunks;
}

/**
 * Places rectangles in a bounding box so that they do not overlap and are as
 * close to the center as possible.
 * 
 * @param bounds The bounding box to place the rectangles inside of.
 * @param rects The rectangles to place in the bounding box.
 */
export function placeRects(bounds: Rect, rects: Rect[]): Map<Rect, PlacedRect> {
  // place rects with largest area
  rects.sort((r1, r2) => r1.w * r1.h > r2.w * r2.h ? -1 : 1);

  const placedRects = new Map<Rect, PlacedRect>();

  const boundsCenterX = bounds.w / 2;
  const boundsCenterY = bounds.h / 2;

  const { min, max } = Math;

  const rows = [bounds.h];
  const cols = [bounds.w];
  const cells = [[false]];
  
  for (const rect of rects) {
    // find contiguous chunks of rows that are as small as possible
    // while being able to contain this rect's height

    const potentialRowChunks = findChunks(rows, rect.h);
    const potentialColChunks = findChunks(cols, rect.w);

    let cellChunk = null;

    // locate the cell chunk that is completely empty and is closest to the
    // center of the bounding box
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
        const chunkCenterDistance = Math.sqrt((chunkCenterX - boundsCenterX) ** 2 + (chunkCenterY - boundsCenterY) ** 2);

        if (cellChunk === null || cellChunk.dist > chunkCenterDistance) 
          cellChunk = { col: potentialColChunk, row: potentialRowChunk, dist: chunkCenterDistance };
      }
    }

    if (!cellChunk) {
      // no more cell chunks found, exit
      break;
    }

    const cellChunkX = cellChunk.col.offset;
    const cellChunkW = cellChunk.col.size;
    const cellChunkY = cellChunk.row.offset;
    const cellChunkH = cellChunk.row.size;

    // get x and y within cell chunk
    const x = max(cellChunkX, min(cellChunkX + cellChunkW - rect.w, boundsCenterX - rect.w / 2));
    const y = max(cellChunkY, min(cellChunkY + cellChunkH - rect.h, boundsCenterY - rect.h / 2));

    const spaceOnLeft = x - cellChunkX;
    const spaceOnTop = y - cellChunkY;
    const spaceOnRight = (cellChunkX + cellChunkW) - (x + rect.w);
    const spaceOnBottom = (cellChunkY + cellChunkH) - (y + rect.h);

    let firstCol = cellChunk.col.start;
    let lastCol = cellChunk.col.end - 1;

    let firstRow = cellChunk.row.start;
    let lastRow = cellChunk.row.end - 1;

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
    
    placedRects.set(rect, {
      x, y, w: rect.w, h: rect.h
    });
  }

  return placedRects;
}
