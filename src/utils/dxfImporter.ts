import DxfParser from 'dxf-parser';
import type { AppState, Point, Obstacle, Drain } from '../store';

export const parseDXF = (fileContent: string): Partial<AppState> | null => {
    try {
        const parser = new DxfParser();
        const dxf = parser.parseSync(fileContent);

        if (!dxf || !dxf.entities) return null;

        const newPoints: Point[] = [];
        const newObstacles: Obstacle[] = [];
        const newDrains: Drain[] = [];

        // 1. Separate Polylines
        const polylines = dxf.entities.filter(e => e.type === 'LWPOLYLINE' || e.type === 'POLYLINE');
        
        let maxArea = -1;
        let borderPoly: any = null;
        let otherPolys: any[] = [];

        // Helper to calc bounds/area approx
        const getBounds = (vertices: any[]) => {
            if (!vertices || vertices.length === 0) return 0;
            let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
            vertices.forEach(v => {
                if (typeof v.x !== 'number' || typeof v.y !== 'number') return;
                minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
            });
            return (maxX - minX) * (maxY - minY);
        };

        polylines.forEach((poly: any) => {
            if (!poly.vertices) return;
            const area = getBounds(poly.vertices);
            if (area > maxArea) {
                if (borderPoly) otherPolys.push(borderPoly);
                maxArea = area;
                borderPoly = poly;
            } else {
                otherPolys.push(poly);
            }
        });

        // Convert Border
        if (borderPoly && borderPoly.vertices) {
            borderPoly.vertices.forEach((v: any) => {
                 if (typeof v.x === 'number' && typeof v.y === 'number') {
                    newPoints.push({ x: v.x, y: v.y });
                 }
            });
        }

        // Convert Obstacles
        otherPolys.forEach((poly: any) => {
            if (!poly.vertices) return;
            // Find center and size
            let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
            let valid = false;
            poly.vertices.forEach((v: any) => {
                if (typeof v.x === 'number' && typeof v.y === 'number') {
                    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
                    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
                    valid = true;
                }
            });
            
            if (valid) {
                const width = maxX - minX;
                const height = maxY - minY;
                const cx = minX + width/2;
                const cy = minY + height/2;
                
                newObstacles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    x: cx,
                    y: cy,
                    width: width || 1,
                    height: height || 1
                });
            }
        });

        // 2. Find Drains (Circles)
        const circles = dxf.entities.filter(e => e.type === 'CIRCLE');
        circles.forEach((c: any) => {
            if (c.center && typeof c.center.x === 'number' && typeof c.center.y === 'number') {
                newDrains.push({
                    id: Math.random().toString(36).substr(2, 9),
                    x: c.center.x,
                    y: c.center.y
                });
            }
        });

        // Validation: Ensure we parsed at least something useful, otherwise return null
        // to avoid wiping state with empty data
        if (newPoints.length === 0 && newObstacles.length === 0 && newDrains.length === 0) {
            return null;
        }

        return {
            points: newPoints,
            obstacles: newObstacles,
            drains: newDrains
        };

    } catch (err) {
        console.error("Failed to parse DXF", err);
        return null;
    }
};
