import React, { useMemo } from 'react';
import { useStore } from '../store';
import { MousePointer2, PenTool, BoxSelect, Circle, Trash2, Upload, Download, DollarSign, Layers, Settings } from 'lucide-react';
import { calculateEstimates } from '../utils/calculations';
import Logo from '/android-chrome-512x512.png'
export const Sidebar: React.FC = () => {
  const { 
    viewMode, setViewMode, 
    activeTool, setTool,
    materialCostPerSqMeter, setMaterialCost,
    reset, points, obstacles,
    roofHeight, tileSize
  } = useStore();

  const estimates = useMemo(() => {
    return calculateEstimates(points, obstacles, materialCostPerSqMeter, roofHeight, tileSize);
  }, [points, obstacles, materialCostPerSqMeter, roofHeight, tileSize]);

  return (
    <div className="w-80 h-full bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col text-slate-300 overflow-y-auto shadow-2xl font-sans">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold flex items-center gap-3 text-white tracking-tight">
             <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <img src={Logo} alt="Logo" />
             </div>
             Roof Planner
          </h1>
        </div>
        <p className="text-xs text-slate-500 font-medium pl-11">v2.0 • Pro Edition</p>
      </div>
      
      <div className="p-6 space-y-8">
        
        {/* Actions Bar */}
        <div className="flex gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/5">
            <ActionButton 
                icon={<Download size={16} />} 
                label="Import" 
                onClick={() => {
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
                }}
            />
            <div className="w-px bg-white/10 my-1"></div>
            <ActionButton 
                icon={<Upload size={16} />} 
                label="Export" 
                onClick={() => {
                    import('./../utils/dxfExporter').then(mod => {
                        const dxf = mod.exportToDXF(useStore.getState());
                        mod.downloadDXF(dxf, 'roof_design.dxf');
                    });
                }}
            />
            <div className="w-px bg-white/10 my-1"></div>
            <ActionButton 
                icon={<Trash2 size={16} />} 
                label="Reset" 
                onClick={reset}
                danger
            />
        </div>

        {/* View Mode Toggle */}
        <div>
          <SectionHeader icon={<Layers size={14} />} title="View Mode" />
          <div className="grid grid-cols-2 gap-1 bg-slate-950/50 p-1.5 rounded-xl border border-white/5">
             <ModeButton active={viewMode === '2D'} onClick={() => setViewMode('2D')}>
                2D Editor
             </ModeButton>
             <ModeButton active={viewMode === '3D'} onClick={() => setViewMode('3D')}>
                3D Viewer
             </ModeButton>
          </div>
        </div>

        {/* 2D Tools */}
        {viewMode === '2D' && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <SectionHeader icon={<PenTool size={14} />} title="Drawing Tools" />
            <div className="grid grid-cols-2 gap-3">
               <ToolButton 
                 active={activeTool === 'SELECT'} 
                 onClick={() => setTool('SELECT')}
                 icon={<MousePointer2 size={20} />}
                 label="Select"
               />
               <ToolButton 
                 active={activeTool === 'DRAW_ROOF'} 
                 onClick={() => setTool('DRAW_ROOF')}
                 icon={<PenTool size={20} />}
                 label="Draw Poly"
               />
               <ToolButton 
                 active={activeTool === 'DRAW_OBSTACLE'} 
                 onClick={() => setTool('DRAW_OBSTACLE')}
                 icon={<BoxSelect size={20} />}
                 label="Obstacle"
               />
               <ToolButton 
                 active={activeTool === 'ADD_DRAIN'} 
                 onClick={() => setTool('ADD_DRAIN')}
                 icon={<Circle size={20} />}
                 label="Add Drain"
               />
               <ToolButton 
                 active={activeTool === 'DELETE'} 
                 onClick={() => setTool('DELETE')}
                 icon={<Trash2 size={20} />}
                 label="Delete"
               />
            </div>
            
            <p className="text-xs text-slate-600 mt-4 italic px-2 text-center leading-relaxed">
                {activeTool === 'SELECT' && "Click & Drag corners to edit shape."}
                {activeTool === 'DRAW_ROOF' && "Click to place points. Close the loop to finish."}
                {activeTool === 'DRAW_OBSTACLE' && "Click to add a standard chimney."}
                {activeTool === 'ADD_DRAIN' && "Click to place a drain point."}
            </p>
          </div>
        )}

        {/* Estimates Panel */}
        <div>
           <SectionHeader icon={<DollarSign size={14} />} title="Estimates" />
           <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl border border-white/5 p-5 space-y-4 shadow-inner relative overflow-hidden group">
              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none"></div>

              <EstimateRow label="Roof Area" value={`${estimates.totalArea.toFixed(2)} m²`} />
              <EstimateRow label="Tiles Needed" value={estimates.tileCount.toLocaleString()} />
              <div className="pt-3 border-t border-white/10">
                 <div className="flex justify-between items-end">
                    <span className="text-sm text-slate-400 font-medium">Total Cost</span>
                    <span className="text-xl font-bold text-emerald-400 font-mono">
                        ${estimates.totalCost.toLocaleString()}
                    </span>
                 </div>
              </div>
           </div>
        </div>
        
        {/* Settings */}
        <div>
             <SectionHeader icon={<Settings size={14} />} title="Configuration" />
             <div className="bg-slate-950/30 rounded-xl border border-white/5 p-4 flex flex-col gap-4">
                
                {/* Roof Height */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Roof Height</span>
                        <span className="text-slate-200 font-mono">{roofHeight}m</span>
                    </div>
                    <input 
                        type="range" min="0.5" max="8" step="0.1"
                        value={roofHeight}
                        onChange={(e) => useStore.getState().setRoofHeight(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 decoration-slate-900"
                    />
                </div>

                {/* Drain Height */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Drain Height</span>
                        <span className="text-slate-200 font-mono">{useStore.getState().drainHeight}m</span>
                    </div>
                    <input 
                        type="range" min="0" max="8" step="0.1"
                        value={useStore.getState().drainHeight}
                        onChange={(e) => useStore.getState().setDrainHeight(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 "
                    />
                </div>

                {/* Tile Size */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Tile Size</span>
                        <span className="text-slate-200 font-mono">{tileSize}m</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="1.0" step="0.05"
                        value={tileSize}
                        onChange={(e) => useStore.getState().setTileSize(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 "
                    />
                </div>

                {/* Wall Thickness */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Wall Thickness</span>
                        <span className="text-slate-200 font-mono">{useStore.getState().wallThickness}m</span>
                    </div>
                    <input 
                        type="range" min="0.1" max="0.5" step="0.05"
                        value={useStore.getState().wallThickness}
                        onChange={(e) => useStore.getState().setWallThickness(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 "
                    />
                </div>
                
                 {/* Material Cost */}
                 <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block">Material Rate ($/m²)</label>
                    <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors">$</span>
                        <input 
                            type="number" 
                            value={materialCostPerSqMeter}
                            onChange={(e) => setMaterialCost(parseFloat(e.target.value))}
                            className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono placeholder-slate-600"
                        />
                    </div>
                 </div>

             </div>
        </div>

      </div>
    </div>
  );
};

// --- styled components ---

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <h2 className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 pl-1">
        {icon}
        {title}
    </h2>
);

const EstimateRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-200 font-medium font-mono">{value}</span>
    </div>
);

const ActionButton = ({ icon, label, onClick, danger }: any) => (
    <button 
        onClick={onClick}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 group relative overflow-hidden
            ${danger 
                ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }
        `}
        title={label}
    >
        <span className="relative z-10 flex items-center gap-2">{icon} {label}</span>
    </button>
);

const ModeButton = ({ active, children, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`py-2 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm
            ${active 
                ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 ring-1 ring-white/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }
        `}
    >
        {children}
    </button>
);

const ToolButton = ({ active, icon, label, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`
            relative p-3 rounded-xl flex flex-col items-center justify-center gap-2 text-xs font-medium transition-all duration-200
            border group
            ${active 
                ? 'bg-blue-500/10 border-blue-500/50 text-blue-400 shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]' 
                : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800/80 hover:border-white/10 hover:text-slate-200'
            }
        `}
    >
        {active && <div className="absolute inset-0 rounded-xl ring-1 ring-blue-500/30 animate-pulse"></div>}
        <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </div>
        <span>{label}</span>
    </button>
);
