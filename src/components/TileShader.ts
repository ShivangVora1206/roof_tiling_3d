import * as THREE from 'three';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

const vertexShader = `
  varying vec3 vPos;
  void main() {
    vPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  uniform vec3 color;
  uniform vec3 gridColor;
  uniform float tileSize;
  uniform float borderWidth;
  
  // Analytic Ridge Data
  #define MAX_RIDGES 200
  uniform vec4 uRidges[MAX_RIDGES]; // x1, z1, x2, z2
  uniform int uRidgeCount;

  varying vec3 vPos;

  // Distance from point P to line segment AB
  float distToSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    // 1. Grid Logic
    float gridX = mod(vPos.x, tileSize);
    float gridZ = mod(vPos.z, tileSize);
    float halfBorder = borderWidth * 0.5;
    
    // Check if within border zone
    bool atBorder = (gridX < halfBorder || gridX > tileSize - halfBorder) || 
                    (gridZ < halfBorder || gridZ > tileSize - halfBorder);
    
    vec3 finalColor = atBorder ? gridColor : color;

    // 2. Analytic Ridge Highlighting
    // Calculate geometric center of the current tile
    // vPos is world position.
    // Tile index:
    float tx = floor(vPos.x / tileSize);
    float tz = floor(vPos.z / tileSize);
    
    // Center of tile in world space
    vec2 tileCenter = vec2(tx * tileSize + tileSize * 0.5, tz * tileSize + tileSize * 0.5);

    // Check distance to any ridge segment
    bool isRidge = false;
    
    for (int i = 0; i < MAX_RIDGES; i++) {
        if (i >= uRidgeCount) break;
        
        vec4 r = uRidges[i];
        vec2 p1 = r.xy;
        vec2 p2 = r.zw;
        
        float d = distToSegment(tileCenter, p1, p2);
        
        // Use 0.6 * tileSize to ensuring connected diagonals (approx sqrt(2)/2 = 0.707)
        if (d < tileSize * 0.6) {
            isRidge = true;
            break;
        }
    }

    if (isRidge) {
         finalColor = mix(finalColor, vec3(1.0, 0.8, 0.2), 0.6); // Yellow tint
    }

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export const TileShaderMaterial = shaderMaterial(
  {
    time: 0,
    color: new THREE.Color(0.2, 0.2, 0.2),
    gridColor: new THREE.Color(0.5, 0.5, 0.5),
    tileSize: 0.5,
    borderWidth: 0.02,
    uRidges: new Array(200).fill(new THREE.Vector4(0, 0, 0, 0)),
    uRidgeCount: 0,
  },
  vertexShader,
  fragmentShader
);

extend({ TileShaderMaterial });
