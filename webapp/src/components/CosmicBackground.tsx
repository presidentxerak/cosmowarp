import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const PARTICLE_COUNT = 1500;
const TUNNEL_RINGS = 28;
const TUNNEL_LENGTH = 80;

/** Generate vertices for a flat hexagon at given radius */
function hexagonVertices(radius: number, z: number): THREE.Vector3[] {
  const verts: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    verts.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      z,
    ));
  }
  return verts;
}

export default function CosmicBackground() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // ─── Scene ───────────────────────────────────────
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.018);

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      150,
    );
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, -TUNNEL_LENGTH);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x0a0a1a, 1);
    container.appendChild(renderer.domElement);

    const colorPalette = [
      new THREE.Color(0xa855f7),
      new THREE.Color(0x06b6d4),
      new THREE.Color(0xec4899),
      new THREE.Color(0xd8b4fe),
      new THREE.Color(0x67e8f9),
      new THREE.Color(0x7c3aed),
    ];

    // ─── Hexagonal Tunnel Rings ──────────────────────
    const tunnelGroup = new THREE.Group();
    interface RingData { lines: THREE.LineLoop; baseZ: number; baseRadius: number }
    const rings: RingData[] = [];

    for (let i = 0; i < TUNNEL_RINGS; i++) {
      const t = i / (TUNNEL_RINGS - 1);
      const z = -t * TUNNEL_LENGTH;
      const radius = 4 + t * 18;

      const verts = hexagonVertices(radius, z);
      const geo = new THREE.BufferGeometry().setFromPoints([...verts, verts[0]]);
      const color = colorPalette[i % colorPalette.length].clone();
      const mat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.15 + (1 - t) * 0.25,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.LineLoop(geo, mat);

      tunnelGroup.add(line);
      rings.push({ lines: line, baseZ: z, baseRadius: radius });
    }
    scene.add(tunnelGroup);

    // ─── Connecting Edge Lines (tunnel frame) ────────
    const edgeGroup = new THREE.Group();
    for (let v = 0; v < 6; v++) {
      const linePoints: THREE.Vector3[] = [];
      for (let i = 0; i < TUNNEL_RINGS; i++) {
        const t = i / (TUNNEL_RINGS - 1);
        const z = -t * TUNNEL_LENGTH;
        const radius = 4 + t * 18;
        const angle = (Math.PI / 3) * v - Math.PI / 6;
        linePoints.push(new THREE.Vector3(
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          z,
        ));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(linePoints);
      const mat = new THREE.LineBasicMaterial({
        color: colorPalette[v],
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      edgeGroup.add(line);
    }
    scene.add(edgeGroup);

    // ─── Tunnel Particles (flying through) ───────────
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const speeds = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const t = Math.random();
      const z = -t * TUNNEL_LENGTH;
      const radius = (4 + t * 18) * (0.3 + Math.random() * 0.7);
      const angle = Math.random() * Math.PI * 2;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = Math.sin(angle) * radius;
      positions[i3 + 2] = z;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.5 + Math.random() * 2.0;
      speeds[i] = 5 + Math.random() * 15;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleMat = new THREE.ShaderMaterial({
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
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = -mvPosition.z;
          vAlpha = smoothstep(80.0, 5.0, dist) * 0.7;
          gl_PointSize = size * uPixelRatio * (15.0 / max(dist, 1.0));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;

        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float glow = 1.0 - smoothstep(0.0, 0.5, d);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor, glow * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // ─── Central Hex Glow ────────────────────────────
    const glowGeo = new THREE.CircleGeometry(2.5, 6);
    const glowMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vec2 center = vUv - 0.5;
          float dist = length(center);
          float ring = smoothstep(0.3, 0.35, dist) * (1.0 - smoothstep(0.35, 0.5, dist));

          vec3 purple = vec3(0.66, 0.33, 0.97);
          vec3 cyan = vec3(0.02, 0.71, 0.83);
          float t = sin(uTime * 0.5) * 0.5 + 0.5;
          vec3 color = mix(purple, cyan, t);

          float pulse = 0.5 + 0.5 * sin(uTime * 0.8);
          float alpha = (ring * 0.6 + (1.0 - smoothstep(0.0, 0.5, dist)) * 0.15) * pulse;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0, -TUNNEL_LENGTH + 2);
    glow.lookAt(camera.position);
    scene.add(glow);

    // ─── Animation ───────────────────────────────────
    let animationId: number;
    const clock = new THREE.Clock();

    function animate() {
      animationId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Update uniforms
      particleMat.uniforms.uTime.value = elapsed;
      glowMat.uniforms.uTime.value = elapsed;

      // Animate rings: rotate + pulse
      rings.forEach(({ lines }, i) => {
        const t = i / (TUNNEL_RINGS - 1);
        lines.rotation.z = elapsed * 0.1 * (1 - t * 0.5) + i * 0.05;

        // Breathing radius
        const breathe = 1 + Math.sin(elapsed * 0.4 + i * 0.3) * 0.05;
        lines.scale.set(breathe, breathe, 1);

        // Pulse opacity
        const mat = lines.material as THREE.LineBasicMaterial;
        const wave = Math.sin(elapsed * 0.6 - i * 0.4) * 0.5 + 0.5;
        mat.opacity = (0.08 + (1 - t) * 0.2) * (0.5 + wave * 0.5);
      });

      // Move particles toward camera (warp speed effect)
      const posArr = particleGeo.attributes.position.array as Float32Array;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        posArr[i3 + 2] += speeds[i] * 0.016; // ~60fps normalized

        // Reset particle to back of tunnel when it passes camera
        if (posArr[i3 + 2] > 10) {
          const newT = 0.7 + Math.random() * 0.3;
          posArr[i3 + 2] = -newT * TUNNEL_LENGTH;
          const radius = (4 + newT * 18) * (0.3 + Math.random() * 0.7);
          const angle = Math.random() * Math.PI * 2;
          posArr[i3] = Math.cos(angle) * radius;
          posArr[i3 + 1] = Math.sin(angle) * radius;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      // Gentle camera sway
      camera.position.x = Math.sin(elapsed * 0.15) * 0.8;
      camera.position.y = Math.cos(elapsed * 0.12) * 0.6;
      camera.lookAt(0, 0, -TUNNEL_LENGTH * 0.5);

      // Rotate edge lines subtly
      edgeGroup.rotation.z = elapsed * 0.03;

      renderer.render(scene, camera);
    }

    animate();

    // ─── Resize ──────────────────────────────────────
    function onResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 1.5);
    }
    window.addEventListener('resize', onResize);

    // ─── Cleanup ─────────────────────────────────────
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      glowGeo.dispose();
      glowMat.dispose();
      rings.forEach(({ lines }) => {
        lines.geometry.dispose();
        (lines.material as THREE.Material).dispose();
      });
      edgeGroup.children.forEach(child => {
        (child as THREE.Line).geometry.dispose();
        ((child as THREE.Line).material as THREE.Material).dispose();
      });
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
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
