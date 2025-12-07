import React, { useMemo } from 'react';
import { useStore } from '../store';
import { MousePointer2, PenTool, BoxSelect, Circle, Trash2, Upload, Download } from 'lucide-react';
import { calculateEstimates } from '../utils/calculations';

export const Sidebar: React.FC = () => {
  const { 
    viewMode, setViewMode, 
    activeTool, setTool,
    materialCostPerSqMeter, setMaterialCost,
    reset, points, obstacles,
    roofHeight, tileSize
  } = useStore();

  /* New logic handles updates via store subscription, but we need to pass new params to calc */
  const estimates = useMemo(() => {
    return calculateEstimates(points, obstacles, materialCostPerSqMeter, roofHeight, tileSize);
  }, [points, obstacles, materialCostPerSqMeter, roofHeight, tileSize]);

  return (
    <div className="w-80 h-full bg-gray-900 border-r border-gray-700 p-4 flex flex-col text-gray-200 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold flex items-center gap-2">
           <span className="text-blue-500">◆</span>
           Roof Planner
        </h1>
        <div className="flex gap-1">
            <button onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.dxf';
                input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                        const text = await file.text();
                        import('./../utils/dxfImporter').then(mod => {
                             const newState = mod.parseDXF(text);
                             if (newState) {
                                 if (newState.points) useStore.getState().setPoints(newState.points);
                                 if (newState.obstacles) useStore.getState().setObstacles(newState.obstacles);
                                 if (newState.drains) useStore.getState().setDrains(newState.drains);
                             } else {
                                 alert("Failed to parse DXF or no valid entities found.");
                             }
                        });
                    }
                };
                input.click();
            }} className="text-gray-500 hover:text-blue-400 p-1" title="Import DXF">
                <Download size={16} />
            </button>
            <button onClick={() => {
                import('./../utils/dxfExporter').then(mod => {
                    const dxf = mod.exportToDXF(useStore.getState());
                    mod.downloadDXF(dxf, 'roof_design.dxf');
                });
            }} className="text-gray-500 hover:text-green-400 p-1" title="Export DXF">
                <Upload size={16} />
            </button>
            <button onClick={reset} className="text-gray-500 hover:text-red-400 p-1" title="Reset All">
               <Trash2 size={16} />
            </button>
        </div>
      </div>
      
      <div className="mb-6">
        <h2 className="text-xs uppercase text-gray-400 font-semibold mb-2">View Mode</h2>
        <div className="grid grid-cols-2 gap-2 bg-gray-800 p-1 rounded-lg">
           <button 
             className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === '2D' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             onClick={() => setViewMode('2D')}
           >
             2D Editor
           </button>
           <button 
             className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${viewMode === '3D' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
             onClick={() => setViewMode('3D')}
           >
             3D Viewer
           </button>
        </div>
      </div>

      {viewMode === '2D' && (
        <div className="mb-6 animate-fade-in">
          <h2 className="text-xs uppercase text-gray-400 font-semibold mb-2">Tools</h2>
          <div className="grid grid-cols-5 gap-2 mb-6">
          <button 
             onClick={() => setTool('SELECT')}
             className={`p-2 rounded flex flex-col items-center justify-center text-xs ${activeTool === 'SELECT' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            <MousePointer2 size={18} className="mb-1" />
            Select
          </button>
          <button 
             onClick={() => setTool('DRAW_ROOF')}
             className={`p-2 rounded flex flex-col items-center justify-center text-xs ${activeTool === 'DRAW_ROOF' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            <PenTool size={18} className="mb-1" />
            Draw
          </button>
          <button 
             onClick={() => setTool('ADD_OBSTACLE')}
             className={`p-2 rounded flex flex-col items-center justify-center text-xs ${activeTool === 'ADD_OBSTACLE' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            <BoxSelect size={18} className="mb-1" />
            Obstacle
          </button>
           <button 
             onClick={() => setTool('ADD_DRAIN')}
             className={`p-2 rounded flex flex-col items-center justify-center text-xs ${activeTool === 'ADD_DRAIN' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            <Circle size={18} className="mb-1" />
            Drain
          </button>
          <button 
             onClick={() => setTool('DELETE')}
             className={`p-2 rounded flex flex-col items-center justify-center text-xs ${activeTool === 'DELETE' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
          >
            <Trash2 size={18} className="mb-1" />
            Delete
          </button>
          </div>

          <p className="text-xs text-gray-500 mt-2 italic px-1">
            {activeTool === 'DRAW_ROOF' && "Click on canvas to add vertices. Connect end to start to close."}
            {activeTool === 'ADD_OBSTACLE' && "Click to add a 1x1m obstacle."}
            {activeTool === 'ADD_DRAIN' && "Click to add a drain."}
          </p>
        </div>
      )}

      <div className="mt-auto pt-6 border-t border-gray-700">
        <h2 className="text-xs uppercase text-gray-400 font-semibold mb-2">Roof Settings</h2>
       <div className="space-y-3 mb-6">
           <div>
             <label className="text-xs text-gray-400 block mb-1">Roof Height ({roofHeight}m)</label>
             <input 
               type="range" min="0.2" max="8" step="0.1"
               value={roofHeight}
               onChange={(e) => useStore.getState().setRoofHeight(Number(e.target.value))}
               className="w-full accent-blue-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
             />
           </div>
           <div>
             <label className="text-xs text-gray-400 block mb-1">Drain Height ({useStore.getState().drainHeight}m)</label>
             <input 
               type="range" min="0" max="8" step="0.1"
               value={useStore.getState().drainHeight}
               onChange={(e) => useStore.getState().setDrainHeight(Number(e.target.value))}
               className="w-full accent-green-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
             />
           </div>
           <div>
             <label className="text-xs text-gray-400 block mb-1">Tile Size ({tileSize}m)</label>
             <input 
               type="range" min="0.1" max="1.0" step="0.05"
               value={tileSize}
               onChange={(e) => useStore.getState().setTileSize(Number(e.target.value))}
               className="w-full accent-purple-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
             />
           </div>
           <div>
             <label className="text-xs text-gray-400 block mb-1">Wall Thickness ({useStore.getState().wallThickness}m)</label>
             <input 
               type="range" min="0.1" max="1.0" step="0.05"
               value={useStore.getState().wallThickness}
               onChange={(e) => useStore.getState().setWallThickness(Number(e.target.value))}
               className="w-full accent-yellow-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
             />
           </div>
        </div>

        <h2 className="text-xs uppercase text-gray-400 font-semibold mb-2">Estimates</h2>
        <div className="space-y-3">
           <div>
            <label className="text-xs text-gray-500 mb-1 block">Base Rate / sq.m</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input 
                type="number" 
                value={materialCostPerSqMeter}
                onChange={(e) => setMaterialCost(Number(e.target.value))}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 pl-6 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {(estimates.effectiveRate !== materialCostPerSqMeter) && (
              <div className="mt-1 text-xs text-orange-400 flex justify-between">
                <span>Effective Rate:</span>
                <span className="font-mono">${estimates.effectiveRate.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="bg-gray-800 p-3 rounded-lg border border-gray-700 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Roof Area</span>
              <span className="font-mono">{estimates.roofArea.toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Obstacles</span>
              <span className="font-mono">-{estimates.obstaclesArea.toFixed(2)} m²</span>
            </div>
            <div className="h-px bg-gray-700 my-1"></div>
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-gray-300">Net Area</span>
              <span className="font-mono">{estimates.netArea.toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-300">Total Cost</span>
              <span className="font-mono text-green-400">${estimates.totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
