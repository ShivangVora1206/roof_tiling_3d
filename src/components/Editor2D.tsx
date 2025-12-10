import React, { useState, useRef } from 'react';
import { useStore } from '../store';
import type { Point } from '../store';

const SNAP_DISTANCE = 0.5; // Meters

export const Editor2D: React.FC = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { 
    points, setPoints, updatePoint,
    obstacles, addObstacle, removeObstacle,
    drains, addDrain, removeDrain,
    activeTool 
  } = useStore();

  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [draggingPoint, setDraggingPoint] = useState<number | null>(null);

  // Convert screen coordinates to meters
  // Assuming a fixed scale for MVP: 1 meter = 40 pixels (centered)
  const SCALE = 40;
  const ORIGIN_X = 500; // Center of canvas roughly
  const ORIGIN_Y = 400;

  const toWorld = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - ORIGIN_X) / SCALE;
    const y = (clientY - rect.top - ORIGIN_Y) / SCALE;
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }; // Snap to 0.1m
  };

  const toScreen = (x: number, y: number) => {
    return {
      x: x * SCALE + ORIGIN_X,
      y: y * SCALE + ORIGIN_Y
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = toWorld(e.clientX, e.clientY);
    setMousePos(pos);

    if (activeTool === 'SELECT' && draggingPoint !== null) {
        updatePoint(draggingPoint, pos.x, pos.y);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const pos = toWorld(touch.clientX, touch.clientY);
    setMousePos(pos);

    if (activeTool === 'SELECT' && draggingPoint !== null) {
        // Prevent scrolling while dragging
        e.preventDefault(); 
        updatePoint(draggingPoint, pos.x, pos.y);
    }
  };

  const handleMouseUp = () => {
      setDraggingPoint(null);
  };

  const handleClick = (e: React.MouseEvent) => {
    const pos = toWorld(e.clientX, e.clientY);

    if (activeTool === 'DRAW_ROOF') {
      // Check if closing shape
      if (points.length > 0) {
        const start = points[0];
        const dist = Math.sqrt(Math.pow(pos.x - start.x, 2) + Math.pow(pos.y - start.y, 2));
        if (dist < SNAP_DISTANCE) {
          // Close shape logic if needed, or just stop adding if we treat list as closed polygon
          return;
        }
      }
      setPoints([...points, pos]);
    } else if (activeTool === 'DRAW_OBSTACLE') {
      // Add standard chimney (1x1)
      const newObs = {
         id: Math.random().toString(36).substr(2, 9),
         x: pos.x,
         y: pos.y,
         width: 1.0,
         height: 1.0
      };
      addObstacle(newObs);
    } else if (activeTool === 'ADD_DRAIN') {
      addDrain({
        id: Math.random().toString(36).substr(2, 9),
        x: pos.x,
        y: pos.y
      });
    }
  };



  // SVG grid pattern
  const GridPattern = () => (
    <pattern id="grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
      <path d={`M ${SCALE} 0 L 0 0 0 ${SCALE}`} fill="none" stroke="#e5e7eb" strokeWidth="1"/>
    </pattern>
  );

  return (
    <div className="w-full h-full bg-gray-50 overflow-hidden relative" 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
        onTouchEnd={handleMouseUp}
        onTouchCancel={handleMouseUp}
    >
      <svg 
        ref={svgRef}
        className={`w-full h-full ${activeTool === 'SELECT' ? 'cursor-default' : 'cursor-crosshair'}`}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onClick={handleClick}
      >
        <defs>
          <GridPattern />
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Origin Axes */}
        <line x1={0} y1={ORIGIN_Y} x2="100%" y2={ORIGIN_Y} stroke="#cbd5e1" strokeWidth="2" />
        <line x1={ORIGIN_X} y1={0} x2={ORIGIN_X} y2="100%" stroke="#cbd5e1" strokeWidth="2" />

        {/* Roof Polygon */}
        {points.length > 0 && (
          <>
            <polygon 
              points={points.map(p => {
                const s = toScreen(p.x, p.y);
                return `${s.x},${s.y}`;
              }).join(' ')}
              fill="rgba(59, 130, 246, 0.2)"
              stroke="#2563eb"
              strokeWidth="2"
            />
            {/* Vertices */}
            {points.map((p, i) => {
              const s = toScreen(p.x, p.y);
              return (
                <circle 
                  key={i} 
                  cx={s.x} 
                  cy={s.y} 
                  r={activeTool === 'SELECT' ? 6 : 4} 
                  fill={draggingPoint === i ? "#db2777" : "#2563eb"} 
                  className={activeTool === 'SELECT' ? 'cursor-grab hover:fill-blue-400' : ''}
                  onMouseDown={(e) => {
                     if (activeTool === 'SELECT') {
                         e.stopPropagation();
                         setDraggingPoint(i);
                     }
                  }}
                  onTouchStart={(e) => {
                     if (activeTool === 'SELECT') {
                         e.stopPropagation();
                         setDraggingPoint(i);
                     }
                  }}
                />
              );
            })}
            
            {/* Preview Line */}
            {activeTool === 'DRAW_ROOF' && mousePos && points.length > 0 && (
               <line 
                x1={toScreen(points[points.length-1].x, points[points.length-1].y).x}
                y1={toScreen(points[points.length-1].x, points[points.length-1].y).y}
                x2={toScreen(mousePos.x, mousePos.y).x}
                y2={toScreen(mousePos.x, mousePos.y).y}
                stroke="#93c5fd"
                strokeWidth="2"
                strokeDasharray="4"
               />
            )}
          </>
        )}

        {/* Obstacles */}
        {obstacles.map(obs => {
          const s = toScreen(obs.x - obs.width/2, obs.y - obs.height/2);
          return (
            <rect
              key={obs.id}
              x={s.x}
              y={s.y}
              width={obs.width * SCALE}
              height={obs.height * SCALE}
              fill="#ea580c"
              opacity={0.6}
              stroke="#c2410c"
              strokeWidth={2}
              className={activeTool === 'DELETE' ? 'cursor-no-drop hover:opacity-80' : ''}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'DELETE') {
                    removeObstacle(obs.id);
                }
              }}
            />
          );
        })}

        {/* Drains */}
        {drains.map(drain => {
          const s = toScreen(drain.x, drain.y);
          return (
            <circle 
              key={drain.id}
              cx={s.x}
              cy={s.y}
              r={0.15 * SCALE}
              fill="#22c55e"
              stroke="#15803d"
              strokeWidth={2}
              className={activeTool === 'DELETE' ? 'cursor-no-drop hover:opacity-80' : ''}
              onClick={(e) => {
                e.stopPropagation();
                if (activeTool === 'DELETE') {
                    removeDrain(drain.id);
                }
              }}
            />
          );
        })}

        {/* Cursor Preview */}
        {mousePos && (
           <text x={toScreen(mousePos.x, mousePos.y).x + 10} y={toScreen(mousePos.x, mousePos.y).y - 10} className="text-xs fill-gray-500 pointer-events-none select-none">
             {mousePos.x.toFixed(1)}, {mousePos.y.toFixed(1)}
           </text>
        )}

      </svg>
      
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-lg text-sm font-medium text-gray-700 flex items-center gap-2">
           <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
           {
            activeTool === 'DRAW_ROOF' ? '✏️ Drawing Roof Mode' :
            activeTool === 'DRAW_OBSTACLE' ? '🧱 Adding Obstacle' :
            activeTool === 'ADD_DRAIN' ? '💧 Adding Drain' :
            'Move mouse to explore'
           }
        </div>
    </div>
  );
};
