import type { Point, Obstacle } from '../store';

/**
 * Calculates the area of a polygon using the Shoelace formula.
 */
export const calculatePolygonArea = (points: Point[]): number => {
  if (points.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
};

/**
 * Calculates the total area of obstacles.
 */
export const calculateObstaclesArea = (obstacles: Obstacle[]): number => {
  return obstacles.reduce((acc, obs) => acc + (obs.width * obs.height), 0);
};

/**
 * Calculates the net roof area and total cost.
 */
export const calculateEstimates = (
  points: Point[],
  obstacles: Obstacle[],
  baseRate: number,
  roofHeight: number,
  tileSize: number
) => {
  const roofArea = calculatePolygonArea(points);
  const obstaclesArea = calculateObstaclesArea(obstacles);
  
  // Net area cannot be negative in reality, but math might allow it if obstacles are huge.
  // We assume obstacles are ON the roof, so we subtract their footprint from tiling area
  // IF the user implies obstacles are things like Chimneys where no tiles go.
  const netArea = Math.max(0, roofArea - obstaclesArea);

  // Dynamic Cost Logic
  // 1. Height Factor: Increase 10% for every meter above 3m
  const heightFactor = 1 + Math.max(0, (roofHeight - 3) * 0.1);
  
  // 2. Tile Size Factor: Smaller tiles need more labor. 
  // Base tile size 0.5m. If 0.25 (smaller), cost increases.
  // Formula: 1 + (0.5 - tileSize) if tileSize < 0.5
  let tileFactor = 1;
  if (tileSize < 0.5) {
      tileFactor = 1 + (0.5 - tileSize); // e.g. 0.1 needs +0.4 (40%) more
  }

  const effectiveRate = baseRate * heightFactor * tileFactor;
  
  return {
    roofArea,
    obstaclesArea,
    netArea,
    effectiveRate,
    totalCost: netArea * effectiveRate
  };
};
