import { create } from 'zustand';

export interface Point {
  x: number;
  y: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Drain {
  id: string;
  x: number;
  y: number;
}

export type ViewMode = '2D' | '3D';
export type Tool = 'SELECT' | 'DRAW_ROOF' | 'ADD_DRAIN' | 'DRAW_OBSTACLE' | 'DELETE';

export interface AppState {
  // Data
  points: Point[];
  obstacles: Obstacle[];
  drains: Drain[];
  materialCostPerSqMeter: number;
  
  // New visualization params
  roofHeight: number;
  drainHeight: number;
  tileSize: number;
  wallThickness: number;
  showGrid: boolean;
  
  // UI State
  viewMode: ViewMode;
  activeTool: Tool;

  // Actions
  addPoint: (point: Point) => void;
  updatePoint: (index: number, x: number, y: number) => void;
  setPoints: (points: Point[]) => void;
  
  addObstacle: (obstacle: Obstacle) => void;
  updateObstacle: (id: string, updates: Partial<Obstacle>) => void;
  removeObstacle: (id: string) => void;
  setObstacles: (obstacles: Obstacle[]) => void;
  
  addDrain: (drain: Drain) => void;
  removeDrain: (id: string) => void;
  setDrains: (drains: Drain[]) => void;
  
  setMaterialCost: (cost: number) => void;
  setRoofHeight: (h: number) => void;
  setDrainHeight: (h: number) => void;
  setTileSize: (s: number) => void;
  setWallThickness: (t: number) => void;
  setShowGrid: (show: boolean) => void;

  setViewMode: (mode: ViewMode) => void;
  setTool: (tool: Tool) => void;
  reset: () => void;
}

export const useStore = create<AppState>((set) => ({
  points: [],
  obstacles: [],
  drains: [],
  materialCostPerSqMeter: 50, // Default cost
  
  roofHeight: 3.0, // Default edge height
  drainHeight: 2.5, // Default drain height (creating slope)
  tileSize: 0.5, // 50cm tiles
  wallThickness: 0.2,
  showGrid: true,

  viewMode: '2D',
  activeTool: 'DRAW_ROOF',

  // Actions
  addPoint: (point) => set((state) => ({ points: [...state.points, point] })),
  updatePoint: (index, x, y) => set((state) => {
    const newPoints = [...state.points];
    newPoints[index] = { ...newPoints[index], x, y };
    return { points: newPoints };
  }),
  setPoints: (points) => set({ points }),
  setObstacles: (obstacles: Obstacle[]) => set({ obstacles }),
  setDrains: (drains: Drain[]) => set({ drains }),
  
  addObstacle: (obstacle) => set((state) => ({ obstacles: [...state.obstacles, obstacle] })),
  updateObstacle: (id: string, updates: Partial<Obstacle>) => set((state) => ({ 
      obstacles: state.obstacles.map(o => o.id === id ? { ...o, ...updates } : o) 
  })),
  removeObstacle: (id) => set((state) => ({ obstacles: state.obstacles.filter(o => o.id !== id) })),
  
  addDrain: (drain) => set((state) => ({ drains: [...state.drains, drain] })),
  removeDrain: (id) => set((state) => ({ drains: state.drains.filter(d => d.id !== id) })),
  
  setMaterialCost: (cost) => set({ materialCostPerSqMeter: cost }),

  setRoofHeight: (h) => set({ roofHeight: h }),
  setDrainHeight: (h) => set({ drainHeight: h }),
  setTileSize: (s) => set({ tileSize: s }),
  setWallThickness: (t) => set({ wallThickness: t }),
  setShowGrid: (show) => set({ showGrid: show }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setTool: (tool) => set({ activeTool: tool }), 
  reset: () => set({ points: [], obstacles: [], drains: [] })
}));
