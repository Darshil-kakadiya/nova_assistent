import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function Orb({ state = 'idle' }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // --- SETUP ---
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // --- GEOMETRY & PARTICLES ---
    // Floating particle sphere representation of JARVIS
    const particleCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorIdle = new THREE.Color('#00d4ff');     // Cyan
    const colorListen = new THREE.Color('#00ff88');   // Green
    const colorProcess = new THREE.Color('#ffcc00');  // Yellow
    const colorSpeak = new THREE.Color('#ff4466');    // Red

    for (let i = 0; i < particleCount; i++) {
      // Spherical coordinates
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 2.0 + (Math.random() * 0.1); // Radius of core orb

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      // Initial color
      colors[i * 3] = colorIdle.r;
      colors[i * 3 + 1] = colorIdle.g;
      colors[i * 3 + 2] = colorIdle.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle texture
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 0.08,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // --- RING LAYERS ---
    const ringGeo = new THREE.RingGeometry(2.3, 2.4, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.15,
      wireframe: true
    });
    const outerRing = new THREE.Mesh(ringGeo, ringMat);
    scene.add(outerRing);

    const ringGeo2 = new THREE.RingGeometry(2.6, 2.62, 32);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x0077ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
      wireframe: true
    });
    const outerRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    outerRing2.rotation.x = Math.PI / 4;
    scene.add(outerRing2);

    // --- ANIMATION LOOP ---
    let clock = new THREE.Clock();

    const animate = () => {
      const elapsedTime = clock.getElapsedTime();
      const positionAttr = geometry.attributes.position;
      const colorAttr = geometry.attributes.color;

      // Speed / intensity multipliers depending on state
      let speedMultiplier = 1.0;
      let noiseIntensity = 0.08;
      let targetColor = colorIdle;

      if (state === 'listening') {
        speedMultiplier = 2.5;
        noiseIntensity = 0.25;
        targetColor = colorListen;
      } else if (state === 'processing') {
        speedMultiplier = 4.0;
        noiseIntensity = 0.40;
        targetColor = colorProcess;
      } else if (state === 'speaking') {
        speedMultiplier = 1.8;
        noiseIntensity = 0.35;
        targetColor = colorSpeak;
      }

      // Update ring colors & opacity
      outerRing.material.color.lerp(targetColor, 0.1);
      outerRing2.material.color.lerp(targetColor, 0.1);
      outerRing.rotation.z += 0.005 * speedMultiplier;
      outerRing2.rotation.y += 0.003 * speedMultiplier;

      // Ripple effect
      for (let i = 0; i < particleCount; i++) {
        const x = originalPositions[i * 3];
        const y = originalPositions[i * 3 + 1];
        const z = originalPositions[i * 3 + 2];

        // 3D noise approximation
        const wave = Math.sin(x * 2.0 + elapsedTime * speedMultiplier) *
                     Math.cos(y * 2.0 + elapsedTime * speedMultiplier) *
                     Math.sin(z * 2.0 + elapsedTime * speedMultiplier);

        const factor = 1.0 + wave * noiseIntensity;

        positionAttr.array[i * 3] = x * factor;
        positionAttr.array[i * 3 + 1] = y * factor;
        positionAttr.array[i * 3 + 2] = z * factor;

        // Color interpolation
        colorAttr.array[i * 3] = THREE.MathUtils.lerp(colorAttr.array[i * 3], targetColor.r, 0.08);
        colorAttr.array[i * 3 + 1] = THREE.MathUtils.lerp(colorAttr.array[i * 3 + 1], targetColor.g, 0.08);
        colorAttr.array[i * 3 + 2] = THREE.MathUtils.lerp(colorAttr.array[i * 3 + 2], targetColor.b, 0.08);
      }

      positionAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;

      particleSystem.rotation.y += 0.002 * speedMultiplier;
      particleSystem.rotation.x += 0.001 * speedMultiplier;

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    animate();

    // --- RESIZE HANDLER ---
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', handleResize);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
    };
  }, [state]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div ref={containerRef} className="w-80 h-80 relative" />
      {/* HUD Glowing Rings overlays */}
      <div className={`absolute w-72 h-72 rounded-full border border-dashed pointer-events-none transition-all duration-700 animate-[spin_20s_linear_infinite] ${
        state === 'listening' ? 'border-jarvis-green/30 scale-105' :
        state === 'processing' ? 'border-jarvis-yellow/30 scale-110' :
        state === 'speaking' ? 'border-jarvis-red/30 scale-105' :
        'border-jarvis-cyan/20 scale-100'
      }`} />
      <div className={`absolute w-64 h-64 rounded-full border border-dotted pointer-events-none transition-all duration-700 animate-[spin_10s_linear_infinite_reverse] ${
        state === 'listening' ? 'border-jarvis-green/20' :
        state === 'processing' ? 'border-jarvis-yellow/20' :
        state === 'speaking' ? 'border-jarvis-red/20' :
        'border-jarvis-cyan/15'
      }`} />
    </div>
  );
}
