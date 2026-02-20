import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 2000;
const GRID_SIZE = 60;
const GRID_DIVISIONS = 30;

export default function CosmicBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Scene Setup ─────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.012);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    camera.position.set(0, 8, 30);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(renderer.domElement);

    // ─── Warp Grid (time grid floor) ─────────────────
    const gridGeometry = new THREE.BufferGeometry();
    const gridPositions: number[] = [];
    const gridColors: number[] = [];
    const half = GRID_SIZE / 2;
    const step = GRID_SIZE / GRID_DIVISIONS;

    for (let i = 0; i <= GRID_DIVISIONS; i++) {
      const pos = -half + i * step;
      // X lines
      gridPositions.push(-half, 0, pos, half, 0, pos);
      // Z lines
      gridPositions.push(pos, 0, -half, pos, 0, half);

      const intensity = 0.15 + Math.sin(i * 0.3) * 0.05;
      // purple-cyan gradient
      for (let j = 0; j < 2; j++) {
        gridColors.push(0.66 * intensity, 0.33 * intensity, 0.97 * intensity);
        gridColors.push(0.02 * intensity, 0.71 * intensity, 0.83 * intensity);
      }
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));
    gridGeometry.setAttribute('color', new THREE.Float32BufferAttribute(gridColors, 3));

    const gridMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    grid.position.y = -6;
    scene.add(grid);

    // ─── Floating Particles (stars / cosmic dust) ────
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);

    const colorPalette = [
      new THREE.Color(0xa855f7), // warp purple
      new THREE.Color(0x06b6d4), // energy cyan
      new THREE.Color(0xec4899), // nebula pink
      new THREE.Color(0xd8b4fe), // warp light
      new THREE.Color(0x67e8f9), // energy light
      new THREE.Color(0xfacc15), // star gold
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      // Spread in a large sphere/cylinder
      const radius = 20 + Math.random() * 60;
      const theta = Math.random() * Math.PI * 2;
      const phi = (Math.random() - 0.5) * Math.PI * 0.8;

      positions[i3] = Math.cos(theta) * Math.cos(phi) * radius;
      positions[i3 + 1] = Math.sin(phi) * radius * 0.4 + (Math.random() - 0.5) * 10;
      positions[i3 + 2] = Math.sin(theta) * Math.cos(phi) * radius;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.5 + Math.random() * 2.5;

      // Slow orbital velocities
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader for point glow
    const particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: renderer.getPixelRatio() },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec3 pos = position;

          // Gentle floating motion
          pos.y += sin(uTime * 0.3 + position.x * 0.1) * 0.5;
          pos.x += sin(uTime * 0.2 + position.z * 0.08) * 0.3;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          float dist = -mvPosition.z;
          vAlpha = smoothstep(100.0, 10.0, dist) * (0.4 + 0.6 * sin(uTime * 0.5 + position.x * 0.2) * 0.5 + 0.5);

          gl_PointSize = size * uPixelRatio * (20.0 / dist);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;

          // Soft glow falloff
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          glow = pow(glow, 1.5);

          gl_FragColor = vec4(vColor, glow * vAlpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ─── Warp Lines (streaking light trails) ─────────
    const warpLineCount = 40;
    const warpGroup = new THREE.Group();
    const warpLines: { mesh: THREE.Line; speed: number; offset: number }[] = [];

    for (let i = 0; i < warpLineCount; i++) {
      const length = 2 + Math.random() * 8;
      const points = [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -length),
      ];
      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      const lineMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + Math.random() * 0.25,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(lineGeo, lineMat);

      const radius = 8 + Math.random() * 25;
      const angle = Math.random() * Math.PI * 2;
      line.position.set(
        Math.cos(angle) * radius,
        (Math.random() - 0.5) * 15,
        Math.sin(angle) * radius - 10,
      );
      line.lookAt(0, 0, 0);

      warpGroup.add(line);
      warpLines.push({
        mesh: line,
        speed: 0.5 + Math.random() * 1.5,
        offset: Math.random() * Math.PI * 2,
      });
    }
    scene.add(warpGroup);

    // ─── Central Nebula Glow ─────────────────────────
    const nebulaGeo = new THREE.SphereGeometry(3, 32, 32);
    const nebulaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          float rim = 1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0));
          rim = pow(rim, 3.0);

          vec3 purple = vec3(0.66, 0.33, 0.97);
          vec3 cyan = vec3(0.02, 0.71, 0.83);
          vec3 pink = vec3(0.93, 0.28, 0.60);

          float t = sin(uTime * 0.3 + vPosition.y * 2.0) * 0.5 + 0.5;
          float t2 = sin(uTime * 0.2 + vPosition.x * 3.0) * 0.5 + 0.5;
          vec3 color = mix(mix(purple, cyan, t), pink, t2 * 0.3);

          float alpha = rim * 0.3 * (0.7 + 0.3 * sin(uTime * 0.5));
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.position.set(0, 2, -5);
    scene.add(nebula);

    // ─── Animation Loop ──────────────────────────────
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Update uniforms
      particleMaterial.uniforms.uTime.value = elapsed;
      nebulaMat.uniforms.uTime.value = elapsed;

      // Rotate particles slowly
      particles.rotation.y = elapsed * 0.02;

      // Animate grid wave
      const gridPos = grid.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < gridPos.length; i += 3) {
        const x = gridPos[i - 1];
        const z = gridPos[i + 1];
        gridPos[i] = Math.sin(elapsed * 0.5 + x * 0.15 + z * 0.15) * 0.4;
      }
      grid.geometry.attributes.position.needsUpdate = true;
      grid.position.y = -6;

      // Animate warp lines pulse
      warpLines.forEach(({ mesh, speed, offset }) => {
        const mat = mesh.material as THREE.LineBasicMaterial;
        mat.opacity = (0.1 + 0.2 * Math.sin(elapsed * speed + offset)) * 0.8;
      });

      // Slow camera sway
      camera.position.x = Math.sin(elapsed * 0.08) * 3;
      camera.position.y = 8 + Math.sin(elapsed * 0.12) * 1.5;
      camera.lookAt(0, 0, 0);

      // Nebula breathe
      const scale = 1 + Math.sin(elapsed * 0.3) * 0.15;
      nebula.scale.set(scale, scale, scale);
      nebula.rotation.y = elapsed * 0.1;

      renderer.render(scene, camera);
    }

    animate();

    // ─── Resize Handler ──────────────────────────────
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 1.5);
    }

    window.addEventListener('resize', onResize);

    // ─── Cleanup ─────────────────────────────────────
    cleanupRef.current = () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      gridGeometry.dispose();
      gridMaterial.dispose();
      nebulaGeo.dispose();
      nebulaMat.dispose();
      warpLines.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
}
