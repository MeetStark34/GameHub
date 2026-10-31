export interface ZipWaypoint {
  r: number;
  c: number;
  /** 1-based order along the path. */
  n: number;
}

/** A wall between two orthogonally adjacent cells. */
export interface ZipWall {
  a: [number, number];
  b: [number, number];
}

export interface ZipPuzzle {
  size: number;
  waypoints: ZipWaypoint[];
  walls: ZipWall[];
}

/** Ordered cells of a full path. */
export type ZipSolution = [number, number][];
