import * as THREE from 'three';
import Delaunator from 'delaunator';
import type { Point, Drain } from '../store';

/**
 * Generates a custom BufferGeometry for a sloped roof.
 * Uses Delaunay triangulation to connect roof border vertices and drain points.
 */
export const generateRoofGeometry = (
  points: Point[], 
  drains: Drain[], 
  roofHeight: number, 
  drainHeight: number
): { geometry: THREE.BufferGeometry, ridges: {x:number, z:number}[] } | null => {
  if (points.length < 3) return null;

  // 1. Prepare vertices for triangulation
  // Input P = [Border Points ... , Drain Points ...]
  const borderPoints2D = points.map(p => [p.x, p.y]);
  const drainPoints2D = drains.map(d => [d.x, d.y]);
  const allPoints2D = [...borderPoints2D, ...drainPoints2D];

  // 2. Triangulate using Delaunator
  // Delaunator takes a flat array of coordinates [x0, y0, x1, y1, ...]
  const flatCoords = allPoints2D.flat();
  const delaunay = new Delaunator(flatCoords);

  // 3. Create 3D Buffers
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // 4. Filter triangles that are OUTSIDE the roof polygon
  // (Delaunay creates a convex hull, so it might add triangles outside concave roofs)
  const isInside = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    // Centroid check
    const mx = (ax + bx + cx) / 3;
    const my = (ay + by + cy) / 3;
    
    // Ray casting algorithm for point (mx, my) inside polygon 'points'
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x, yi = points[i].y;
        const xj = points[j].x, yj = points[j].y;
        const intersect = ((yi > my) !== (yj > my)) &&
            (mx < (xj - xi) * (my - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
  };

  // Helper to create a key for an edge
  const edgeKey = (i1: number, i2: number) => {
    return i1 < i2 ? `${i1}:${i2}` : `${i2}:${i1}`;
  };

  // Map to store faces adjacent to each edge
  const edgeFaces = new Map<string, number[]>(); // EdgeKey -> [TriangleIndex, TriangleIndex...]

  const getNormal = (i0: number, i1: number, i2: number) => {
      const p0 = allPoints2D[i0];
      const p1 = allPoints2D[i1];
      const p2 = allPoints2D[i2];
      
      const h0 = i0 < points.length ? roofHeight : drainHeight;
      const h1 = i1 < points.length ? roofHeight : drainHeight;
      const h2 = i2 < points.length ? roofHeight : drainHeight;

      const vA = new THREE.Vector3(p1[0] - p0[0], h1 - h0, p1[1] - p0[1]);
      const vB = new THREE.Vector3(p2[0] - p0[0], h2 - h0, p2[1] - p0[1]);
      
      const n = new THREE.Vector3().crossVectors(vA, vB).normalize();
      return n;
  };

  const faceNormals: THREE.Vector3[] = [];

  // Convert triangulation to geometry
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const i0 = delaunay.triangles[i];
    const i1 = delaunay.triangles[i + 1];
    const i2 = delaunay.triangles[i + 2];

    const p0 = allPoints2D[i0];
    const p1 = allPoints2D[i1];
    const p2 = allPoints2D[i2];

    // Check if triangle is valid (inside polygon)
    if (isInside(p0[0], p0[1], p1[0], p1[1], p2[0], p2[1])) {
       // Store Normal
       const normal = getNormal(i0, i1, i2);
       faceNormals.push(normal);
       const triIndex = faceNormals.length - 1;

       // Track edges -> faces
       const e1 = edgeKey(i0, i1);
       const e2 = edgeKey(i1, i2);
       const e3 = edgeKey(i2, i0);
       
       if (!edgeFaces.has(e1)) edgeFaces.set(e1, []); edgeFaces.get(e1)!.push(triIndex);
       if (!edgeFaces.has(e2)) edgeFaces.set(e2, []); edgeFaces.get(e2)!.push(triIndex);
       if (!edgeFaces.has(e3)) edgeFaces.set(e3, []); edgeFaces.get(e3)!.push(triIndex);
       
       const baseIndex = vertices.length / 3;
       
       // Vertex 0
       const h0 = i0 < points.length ? roofHeight : drainHeight;
       vertices.push(p0[0], h0, p0[1]); // x, y(up), z
       uvs.push(p0[0], p0[1]);

       // Vertex 1
       const h1 = i1 < points.length ? roofHeight : drainHeight;
       vertices.push(p1[0], h1, p1[1]);
       uvs.push(p1[0], p1[1]);

       // Vertex 2
       const h2 = i2 < points.length ? roofHeight : drainHeight;
       vertices.push(p2[0], h2, p2[1]);
       uvs.push(p2[0], p2[1]);

       indices.push(baseIndex, baseIndex + 1, baseIndex + 2);
    }
  }

  // Extract Ridge Lines (Edges shared by 2 triangles with DIFFERENT normals)
  const ridges: {x:number, z:number}[] = []; 
  
  edgeFaces.forEach((tris, key) => {
      if (tris.length === 2) {
          // Internal Edge
          const n1 = faceNormals[tris[0]];
          const n2 = faceNormals[tris[1]];
          
          // Check dot product
          // If dot ~ 1.0, they are coplanar (flat)
          const dot = n1.dot(n2);
          
          // Threshold: if dot < 0.99, considers it a ridge/valley
          if (dot < 0.999) {
              const [i1Str, i2Str] = key.split(':');
              const idx1 = parseInt(i1Str);
              const idx2 = parseInt(i2Str);
              const p1 = allPoints2D[idx1];
              const p2 = allPoints2D[idx2];
              ridges.push({ x: p1[0], z: p1[1] }); // Start
              ridges.push({ x: p2[0], z: p2[1] }); // End
          }
      }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  // geometry.setIndex(indices); 
  
  geometry.computeVertexNormals();
  return { geometry, ridges };
};

/**
 * Generates vertical walls around the roof perimeter with thickness.
 * Goes from y=0 to y=roofHeight.
 */
export const generateWallGeometry = (
  points: Point[],
  roofHeight: number,
  thickness: number
): THREE.BufferGeometry | null => {
  if (points.length < 3) return null;

  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const baseHeight = 0;

  // Helper to get edge vector
  const getEdge = (i: number) => {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    // Normalize
    const len = Math.sqrt(dx * dx + dy * dy);
    return { x: dx / len, y: dy / len };
  };

  // 1. Calculate Inner Vertices (Offset Polygon)
  // We assume Counter-Clockwise winding for "Inner" to be left.
  // Actually, we should just push "inwards".
  // Simple approach: Miter offset.
  const innerPoints = points.map((p, i) => {
    const prevIdx = (i - 1 + points.length) % points.length;
    const e1 = getEdge(prevIdx);
    const e2 = getEdge(i);

    // Tangents (Normals 90 deg rotated)
    const n1 = { x: -e1.y, y: e1.x };
    const n2 = { x: -e2.y, y: e2.x };

    // Average normal (bisector) directions
    // Determine if convex or concave? 
    // Miter calculation:
    // tangent = (e1 + e2).normalize() ? No.
    // Let's use standard miter formula.
    
    // Normal at vertex:
    // We want to move 'thickness' distance along the bisector.
    // But which way is 'in'? Assuming standard polygon winding.
    // Let's rely on the cross product to detect orientation or just assume CCW.
    
    // Simple robust method for architectural walls: 
    // Just extrude edges along their normals and intersect lines.
    // Or just average normals.
    
    let avgNx = n1.x + n2.x;
    let avgNy = n1.y + n2.y;
    const len = Math.sqrt(avgNx * avgNx + avgNy * avgNy);
    if (len < 0.001) {
       // Parallel
       return { x: p.x - n1.x * thickness, y: p.y - n1.y * thickness };
    }
    
    // Miter length adjustment
    // dot product of n1 and bisector
    const dot = n1.x * (avgNx/len) + n1.y * (avgNy/len);
    const miterLen = thickness / dot;
    
    return {
      x: p.x - (avgNx / len) * miterLen,
      y: p.y - (avgNy / len) * miterLen
    };
  });

  const addQuad = (
    p1: {x:number, y:number, z:number}, 
    p2: {x:number, y:number, z:number}, 
    p3: {x:number, y:number, z:number}, 
    p4: {x:number, y:number, z:number}
  ) => {
    const base = vertices.length / 3;
    vertices.push(p1.x, p1.y, p1.z);
    vertices.push(p2.x, p2.y, p2.z);
    vertices.push(p3.x, p3.y, p3.z);
    vertices.push(p4.x, p4.y, p4.z);
    
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1); // Simple UV

    // Triangle 1
    indices.push(base, base + 1, base + 2);
    // Triangle 2
    indices.push(base, base + 2, base + 3);
  };

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    
    const ip1 = innerPoints[i];
    const ip2 = innerPoints[(i + 1) % points.length];

    // OUTER WALL (p1 -> p2)
    addQuad(
      {x: p1.x, y: baseHeight, z: p1.y},
      {x: p2.x, y: baseHeight, z: p2.y},
      {x: p2.x, y: roofHeight, z: p2.y},
      {x: p1.x, y: roofHeight, z: p1.y}
    );

    // INNER WALL (ip2 -> ip1) reverse winding
    addQuad(
      {x: ip2.x, y: baseHeight, z: ip2.y},
      {x: ip1.x, y: baseHeight, z: ip1.y},
      {x: ip1.x, y: roofHeight, z: ip1.y},
      {x: ip2.x, y: roofHeight, z: ip2.y}
    );

    // TOP CAP (p1 -> ip1 -> ip2 -> p2)? NO.
    // Rim: p1-top -> p2-top -> ip2-top -> ip1-top
    addQuad(
      {x: p1.x, y: roofHeight, z: p1.y},
      {x: p2.x, y: roofHeight, z: p2.y},
      {x: ip2.x, y: roofHeight, z: ip2.y},
      {x: ip1.x, y: roofHeight, z: ip1.y}
    );
    
    // BOTTOM CAP (p1-bot -> p2-bot -> ip2-bot -> ip1-bot)
    // Optional, but good for solidity. Invert winding.
    addQuad(
      {x: p1.x, y: baseHeight, z: p1.y},
      {x: ip1.x, y: baseHeight, z: ip1.y},
      {x: ip2.x, y: baseHeight, z: ip2.y},
      {x: p2.x, y: baseHeight, z: p2.y}
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};
