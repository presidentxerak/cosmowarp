import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import * as THREE from 'three';

const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

const TUNNEL_LENGTH = 80;

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

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function CosmicBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (hasError) return;
    if (!isWebGLAvailable()) {
      setHasError(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const mobile = isMobile();
    const PARTICLE_COUNT = mobile ? 400 : 1500;
    const TUNNEL_RINGS = mobile ? 14 : 28;

    const isDark = theme === 'dark';
    // In dark mode: white traces on black. In light mode: black traces on white.
    const traceColor = isDark ? 0xffffff : 0x000000;
    const bgColor = isDark ? 0x000000 : 0xffffff;
    const traceOpacityBase = isDark ? 0.08 : 0.06;
    const fogColor = bgColor;

    let renderer: THREE.WebGLRenderer | null = null;
    let animationId = 0;
    let disposed = false;

    try {
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(fogColor, 0.018);

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        150,
      );
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, -TUNNEL_LENGTH);

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: mobile ? 'low-power' : 'default',
        failIfMajorPerformanceCaveat: false,
      });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1 : 1.5));
      renderer.setClearColor(bgColor, 1);

      const canvas = renderer.domElement;

      function onContextLost(e: Event) {
        e.preventDefault();
        if (animationId) cancelAnimationFrame(animationId);
        animationId = 0;
      }
      function onContextRestored() {
        if (!disposed) animate();
      }
      canvas.addEventListener('webglcontextlost', onContextLost);
      canvas.addEventListener('webglcontextrestored', onContextRestored);

      container.appendChild(canvas);

      const baseColor = new THREE.Color(traceColor);

      // ─── Hexagonal Tunnel Rings ──────────────────────
      const tunnelGroup = new THREE.Group();
      const rings: { lines: THREE.LineLoop }[] = [];

      for (let i = 0; i < TUNNEL_RINGS; i++) {
        const t = i / (TUNNEL_RINGS - 1);
        const z = -t * TUNNEL_LENGTH;
        const radius = 4 + t * 18;

        const verts = hexagonVertices(radius, z);
        const geo = new THREE.BufferGeometry().setFromPoints([...verts, verts[0]]);
        const mat = new THREE.LineBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: traceOpacityBase + (1 - t) * 0.15,
          blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        const line = new THREE.LineLoop(geo, mat);
        tunnelGroup.add(line);
        rings.push({ lines: line });
      }
      scene.add(tunnelGroup);

      // ─── Connecting Edge Lines ────────────────────────
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
          color: baseColor,
          transparent: true,
          opacity: traceOpacityBase * 0.5,
          blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        });
        edgeGroup.add(new THREE.Line(geo, mat));
      }
      scene.add(edgeGroup);

      // ─── Tunnel Particles ─────────────────────────────
      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const pColors = new Float32Array(PARTICLE_COUNT * 3);
      const pSizes = new Float32Array(PARTICLE_COUNT);
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
        pColors[i3] = baseColor.r;
        pColors[i3 + 1] = baseColor.g;
        pColors[i3 + 2] = baseColor.b;
        pSizes[i] = 0.5 + Math.random() * 2.0;
        speeds[i] = 5 + Math.random() * 15;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
      particleGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

      const particleAlphaMax = isDark ? 0.5 : 0.3;

      const particleMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uPixelRatio: { value: renderer.getPixelRatio() },
          uAlphaMax: { value: particleAlphaMax },
        },
        vertexShader: `
          precision mediump float;
          attribute float aSize;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float uTime;
          uniform float uPixelRatio;
          uniform float uAlphaMax;
          void main() {
            vColor = color;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float dist = -mvPosition.z;
            vAlpha = smoothstep(80.0, 5.0, dist) * uAlphaMax;
            gl_PointSize = aSize * uPixelRatio * (15.0 / max(dist, 1.0));
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          precision mediump float;
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
        blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
      });

      scene.add(new THREE.Points(particleGeo, particleMat));

      // ─── Central Hex Glow ────────────────────────────
      const glowGeo = new THREE.CircleGeometry(2.5, 6);
      const glowColorVal = isDark ? 1.0 : 0.0;
      const glowMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColorVal: { value: glowColorVal },
        },
        vertexShader: `
          precision mediump float;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          precision mediump float;
          uniform float uTime;
          uniform float uColorVal;
          varying vec2 vUv;
          void main() {
            vec2 center = vUv - 0.5;
            float dist = length(center);
            float ring = smoothstep(0.3, 0.35, dist) * (1.0 - smoothstep(0.35, 0.5, dist));
            vec3 col = vec3(uColorVal);
            float pulse = 0.5 + 0.5 * sin(uTime * 0.8);
            float alpha = (ring * 0.4 + (1.0 - smoothstep(0.0, 0.5, dist)) * 0.1) * pulse;
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(0, 0, -TUNNEL_LENGTH + 2);
      glow.lookAt(camera.position);
      scene.add(glow);

      // ─── Animation ───────────────────────────────────
      const clock = new THREE.Clock();

      function animate() {
        if (disposed) return;
        animationId = requestAnimationFrame(animate);
        try {
          const elapsed = clock.getElapsedTime();
          particleMat.uniforms.uTime.value = elapsed;
          glowMat.uniforms.uTime.value = elapsed;

          rings.forEach(({ lines }, i) => {
            const t = i / (TUNNEL_RINGS - 1);
            lines.rotation.z = elapsed * 0.1 * (1 - t * 0.5) + i * 0.05;
            const breathe = 1 + Math.sin(elapsed * 0.4 + i * 0.3) * 0.05;
            lines.scale.set(breathe, breathe, 1);
            const mat = lines.material as THREE.LineBasicMaterial;
            const wave = Math.sin(elapsed * 0.6 - i * 0.4) * 0.5 + 0.5;
            mat.opacity = (traceOpacityBase + (1 - t) * 0.15) * (0.5 + wave * 0.5);
          });

          const posArr = particleGeo.attributes.position.array as Float32Array;
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            posArr[i3 + 2] += speeds[i] * 0.016;
            if (posArr[i3 + 2] > 10) {
              const newT = 0.7 + Math.random() * 0.3;
              posArr[i3 + 2] = -newT * TUNNEL_LENGTH;
              const r = (4 + newT * 18) * (0.3 + Math.random() * 0.7);
              const a = Math.random() * Math.PI * 2;
              posArr[i3] = Math.cos(a) * r;
              posArr[i3 + 1] = Math.sin(a) * r;
            }
          }
          particleGeo.attributes.position.needsUpdate = true;

          camera.position.x = Math.sin(elapsed * 0.15) * 0.8;
          camera.position.y = Math.cos(elapsed * 0.12) * 0.6;
          camera.lookAt(0, 0, -TUNNEL_LENGTH * 0.5);
          edgeGroup.rotation.z = elapsed * 0.03;

          renderer!.render(scene, camera);
        } catch {
          if (animationId) cancelAnimationFrame(animationId);
          animationId = 0;
        }
      }

      animate();

      // ─── Resize ──────────────────────────────────────
      function onResize() {
        if (!renderer || disposed) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        particleMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, mobile ? 1 : 1.5);
      }
      window.addEventListener('resize', onResize);

      // ─── Cleanup ─────────────────────────────────────
      return () => {
        disposed = true;
        window.removeEventListener('resize', onResize);
        canvas.removeEventListener('webglcontextlost', onContextLost);
        canvas.removeEventListener('webglcontextrestored', onContextRestored);
        if (animationId) cancelAnimationFrame(animationId);
        try {
          renderer?.dispose();
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
        } catch {
          // Ignore disposal errors
        }
        if (container.contains(canvas)) {
          container.removeChild(canvas);
        }
      };
    } catch {
      setHasError(true);
      return () => { disposed = true; };
    }
  }, [hasError, theme]);

  if (hasError) {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{
          pointerEvents: 'none',
          background: theme === 'dark' ? '#000000' : '#ffffff',
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      style={{ pointerEvents: 'none' }}
    />
  );
}
