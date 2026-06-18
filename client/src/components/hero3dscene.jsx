import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function PrimersLogo3D() {
  const groupRef = useRef();
  
  const pGeom = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.8, -2);
    shape.lineTo(-0.4, -2);
    shape.lineTo(-0.4, 1.5);
    shape.lineTo(0.8, 1.5);
    shape.quadraticCurveTo(1.5, 1.5, 1.5, 0.8);
    shape.lineTo(1.5, 0);
    shape.quadraticCurveTo(1.5, -0.7, 0.8, -0.7);
    shape.lineTo(-0.4, -0.7);
    shape.lineTo(-0.4, -2);
    const settings = { depth: 0.3, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.04, bevelSegments: 2 };
    return new THREE.ExtrudeGeometry(shape, settings);
  }, []);

  const ringGeom = useMemo(() => new THREE.TorusGeometry(2.5, 0.04, 16, 100), []);
  const ring2Geom = useMemo(() => new THREE.TorusGeometry(2.2, 0.03, 16, 80), []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={pGeom}>
        <meshPhysicalMaterial color="#4361EE" metalness={0.1} roughness={0.2} clearcoat={0.3} clearcoatRoughness={0.2} />
      </mesh>
      <mesh geometry={ringGeom} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#4361EE" emissive="#4361EE" emissiveIntensity={0.5} transparent opacity={0.4} />
      </mesh>
      <mesh geometry={ring2Geom} rotation={[Math.PI / 3, 0, Math.PI / 4]}>
        <meshStandardMaterial color="#91a7ff" emissive="#91a7ff" emissiveIntensity={0.6} transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function FloatingParticles({ count = 80 }) {
  const points = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      p[i] = (Math.random() - 0.5) * 12;
      p[i + 1] = (Math.random() - 0.5) * 8;
      p[i + 2] = (Math.random() - 0.5) * 6;
    }
    return p;
  }, [count]);
  const ref = useRef();
  useFrame((state, delta) => {
    if (ref.current) { ref.current.rotation.y += delta * 0.05; ref.current.rotation.x += delta * 0.03; }
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[points, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#91a7ff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

export default function Hero3DScene() {
  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }} dpr={[1, 2]}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-3, -2, -2]} intensity={0.3} color="#748ffc" />
        <pointLight position={[0, 0, 5]} intensity={0.5} color="#4361EE" />
        <FloatingParticles count={100} />
        <PrimersLogo3D />
      </Canvas>
    </div>
  );
}
