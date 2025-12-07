import type { AppState } from '../store';
import { generateRoofGeometry } from './geometry';

// Simple DXF Writer Helper
// Generates standard ASCII DXF format
// Entities: LWPOLYLINE (2D), 3DFACE (3D geometry)

export const exportToDXF = (state: AppState) => {
  const { points, obstacles, drains, roofHeight, drainHeight } = state;
  let dxf = "";

  // 1. Header & Tables (Minimal)
  dxf += "0\nSECTION\n2\nHEADER\n0\nENDSEC\n";
  dxf += "0\nSECTION\n2\nTABLES\n";
  
  // Layers
  dxf += "0\nTABLE\n2\nLAYER\n";
  const addLayer = (name: string, color: number) => {
    dxf += "0\nLAYER\n2\n" + name + "\n70\n0\n62\n" + color + "\n6\nCONTINUOUS\n";
  };
  addLayer("ROOF_BORDER", 5); // Blue
  addLayer("OBSTACLES", 1); // Red
  addLayer("DRAINS", 3); // Green
  addLayer("ROOF_MESH", 7); // White
  dxf += "0\nENDTAB\n";
  dxf += "0\nENDSEC\n";

  // 2. Entities Section
  dxf += "0\nSECTION\n2\nENTITIES\n";

  // --- 2D EXPORT ---

  // Roof Border (LWPOLYLINE)
  if (points.length > 0) {
    dxf += "0\nLWPOLYLINE\n8\nROOF_BORDER\n";
    dxf += "90\n" + points.length + "\n"; // Num vertices
    dxf += "70\n1\n"; // Closed
    points.forEach(p => {
      dxf += "10\n" + p.x + "\n20\n" + p.y + "\n";
    });
  }

  // Obstacles (LWPOLYLINE)
  obstacles.forEach(obs => {
    const p1 = { x: obs.x - obs.width/2, y: obs.y - obs.height/2 };
    const p2 = { x: obs.x + obs.width/2, y: obs.y - obs.height/2 };
    const p3 = { x: obs.x + obs.width/2, y: obs.y + obs.height/2 };
    const p4 = { x: obs.x - obs.width/2, y: obs.y + obs.height/2 };

    dxf += "0\nLWPOLYLINE\n8\nOBSTACLES\n";
    dxf += "90\n4\n"; 
    dxf += "70\n1\n"; // Closed
    [p1, p2, p3, p4].forEach(p => {
      dxf += "10\n" + p.x + "\n20\n" + p.y + "\n";
    });
  });

  // Drains (CIRCLE)
  drains.forEach(d => {
    dxf += "0\nCIRCLE\n8\nDRAINS\n";
    dxf += "10\n" + d.x + "\n20\n" + d.y + "\n";
    dxf += "40\n0.15\n"; // Radius
  });

  // --- 3D EXPORT (Faces) ---
  const res = generateRoofGeometry(points, drains, roofHeight, drainHeight);
  if (res && res.geometry) {
      const positions = res.geometry.attributes['position'].array;
      // 3 positions per face (Triangle)
      // 3DFACE requires 4 points, repeat the last for triangles
      for (let i = 0; i < positions.length; i += 9) {
          // ThreeJS vertices are [x, y, z].
          
          const v1x = positions[i];   const v1y = positions[i+1]; const v1z = positions[i+2];
          const v2x = positions[i+3]; const v2y = positions[i+4]; const v2z = positions[i+5];
          const v3x = positions[i+6]; const v3y = positions[i+7]; const v3z = positions[i+8];

          dxf += "0\n3DFACE\n8\nROOF_MESH\n";
          // Point 1
          dxf += "10\n" + v1x + "\n20\n" + v1z + "\n30\n" + v1y + "\n"; // Attempting to rotate to Z-up for CAD
          // Point 2
          dxf += "11\n" + v2x + "\n21\n" + v2z + "\n31\n" + v2y + "\n";
          // Point 3
          dxf += "12\n" + v3x + "\n22\n" + v3z + "\n32\n" + v3y + "\n";
          // Point 4 (Repeat 3)
          dxf += "13\n" + v3x + "\n23\n" + v3z + "\n33\n" + v3y + "\n";
      }
  }

  dxf += "0\nENDSEC\n";
  dxf += "0\nEOF\n";

  return dxf;
};

export const downloadDXF = (data: string, filename: string) => {
    const blob = new Blob([data], { type: 'application/dxf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
