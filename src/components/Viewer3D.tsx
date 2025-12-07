import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { generateRoofGeometry, generateWallGeometry } from '../utils/geometry';
import './TileShader'; // Register shader

// Inner component to handle R3F hooks
const SceneContent: React.FC = () => {
  const { points, obstacles, drains, roofHeight, drainHeight, tileSize, wallThickness } = useStore();
  const shaderRef = useRef<any>(null);

  // Destructure result
  const { geometry: roofGeometry, ridges } = useMemo(() => {
    const res = generateRoofGeometry(points, drains, roofHeight, drainHeight);
    return res ? res : { geometry: null, ridges: [] };
  }, [points, drains, roofHeight, drainHeight]);

  /* Analytic Ridge Data Preparation */
  const ridgeUniforms = useMemo(() => {
    const MAX_RIDGES = 200;
    const arr = new Array(MAX_RIDGES).fill(new THREE.Vector4(0, 0, 0, 0));
    let count = 0;

    if (ridges) {
        // Ridges comes as [start, end, start, end...] objects
        for (let i = 0; i < ridges.length; i+=2) {
            if (count >= MAX_RIDGES) break;
            const p1 = ridges[i];
            const p2 = ridges[i+1];
            if (p1 && p2) {
                // p.y from geometry.ts is actually Z in 2D top-down logic here
                arr[count] = new THREE.Vector4(p1.x, p1.z, p2.x, p2.z);
                count++;
            }
        }
    }

    return { uRidges: arr, uRidgeCount: count };
  }, [ridges]);

  const wallGeometry = useMemo(() => {
    return generateWallGeometry(points, roofHeight, wallThickness);
  }, [points, roofHeight, wallThickness]);

  useFrame((state) => {
    if (shaderRef.current) {
        shaderRef.current.time = state.clock.elapsedTime;
        // Keep uniforms updated if needed (React Three Fiber handles refs usually, but good to be safe if dynamic)
        shaderRef.current.uRidgeCount = ridgeUniforms.uRidgeCount;
        shaderRef.current.uRidges = ridgeUniforms.uRidges;
    }
  });

  return (
    <Center top>
      {/* Sloped Roof Mesh */}
      {roofGeometry && (
        <mesh 
          geometry={roofGeometry} 
          receiveShadow 
          castShadow
        >
           {/* @ts-ignore - shaderMaterial creates this element */}
           <tileShaderMaterial 
             ref={shaderRef} 
             attach="material" 
             color={new THREE.Color('#475569')} // Slate-600 like color
             gridColor={new THREE.Color('#cbd5e1')} // Light grid lines
             tileSize={tileSize}
             borderWidth={0.03}
             uRidges={ridgeUniforms.uRidges}
             uRidgeCount={ridgeUniforms.uRidgeCount}
             transparent={false}
           />
        </mesh>
      )}

      {/* Wall Mesh */}
      {wallGeometry && (
        <mesh 
          geometry={wallGeometry} 
          receiveShadow 
          castShadow
        >
          <meshStandardMaterial color="#64748b" roughness={0.8} /> {/* Concrete grey */}
        </mesh>
      )}

      {/* Obstacles (Mapped to 3D with height adjustment) */}
      {obstacles.map(obs => (
         <mesh 
           key={obs.id}
           position={[obs.x, drainHeight , obs.y]} 
           castShadow
         >
           <boxGeometry args={[obs.width, 1, obs.height]} />
           <meshStandardMaterial color="#ea580c" roughness={0.5} /> {/* Orange obstacle */}
         </mesh>
      ))}

      {/* Drains */}
      {drains.map(drain => (
         <mesh
          key={drain.id}
          position={[drain.x, drainHeight, drain.y]}
         >
           <cylinderGeometry args={[0.15, 0.15, 0.5, 16]} />
           <meshStandardMaterial color="#22c55e" />
         </mesh>
      ))}
    </Center>
  );
};

export const Viewer3D: React.FC = () => {
  return (
    <div className="w-full h-full bg-gray-900 relative">
       <Canvas camera={{ position: [10, 15, 10], fov: 50 }} shadows>
        <color attach="background" args={['#e2e8f0']} /> {/* Lighter background like UDS */}
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 20, 5]} intensity={1.2} castShadow shadow-bias={-0.0001} />
        
        <Grid position={[0, -0.01, 0]} args={[100, 100]} cellColor="#94a3b8" sectionColor="#64748b" fadeDistance={50} />
        <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        
        <SceneContent />
      </Canvas>
      
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm text-sm text-gray-800 pointer-events-none border border-gray-200">
        <h3 className="font-bold">3D Preview</h3>
        <p className="text-xs text-gray-500">Left Click: Rotate | Right Click: Pan</p>
      </div>
    </div>
  );
};
