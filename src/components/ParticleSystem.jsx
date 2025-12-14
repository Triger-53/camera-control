import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import useStore from '../store';

const COUNT = 5000;
const DUMMY = new THREE.Object3D();

const ParticleSystem = () => {
    const meshRef = useRef();
    const { handPosition, isPinching, gesture, rotation, zoom, shapePosition } = useStore();

    // Current shape state
    const [shapeIndex, setShapeIndex] = useState(0);
    const shapes = ['CLOUD', 'HEART', 'FLOWER', 'SATURN', 'FIREWORKS', 'DNA', 'GALAXY'];

    // Store target positions for each shape
    const positions = useMemo(() => {
        const pos = {
            CLOUD: [],
            HEART: [],
            FLOWER: [],
            SATURN: [],
            FIREWORKS: [],
            DNA: [],
            GALAXY: []
        };

        // CLOUD (Random sphere)
        for (let i = 0; i < COUNT; i++) {
            const r = 4 * Math.cbrt(Math.random());
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            pos.CLOUD.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }

        // HEART
        for (let i = 0; i < COUNT; i++) {
            const t = Math.random() * Math.PI * 2;
            const x = 16 * Math.pow(Math.sin(t), 3);
            const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
            const z = (Math.random() - 0.5) * 2;
            pos.HEART.push(x * 0.1, y * 0.1, z);
        }

        // FLOWER (Polar rose)
        for (let i = 0; i < COUNT; i++) {
            const theta = Math.random() * 2 * Math.PI;
            const k = 4; // Petals
            const r = Math.cos(k * theta) + 2;
            const x = r * Math.cos(theta);
            const y = r * Math.sin(theta);
            const z = (Math.random() - 0.5) * 1;
            pos.FLOWER.push(x, y, z);
        }

        // SATURN (Sphere + Ring)
        for (let i = 0; i < COUNT; i++) {
            if (i < COUNT * 0.3) {
                // Planet
                const r = 1.5 * Math.cbrt(Math.random());
                const theta = Math.random() * 2 * Math.PI;
                const phi = Math.acos(2 * Math.random() - 1);
                pos.SATURN.push(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
            } else {
                // Ring
                const innerR = 2.0;
                const outerR = 3.5;
                const r = Math.sqrt(Math.random() * (outerR * outerR - innerR * innerR) + innerR * innerR);
                const theta = Math.random() * 2 * Math.PI;
                pos.SATURN.push(
                    r * Math.cos(theta),
                    r * Math.sin(theta) * 0.2,
                    r * Math.sin(theta)
                );
            }
        }

        // FIREWORKS (Explosion)
        for (let i = 0; i < COUNT; i++) {
            const r = 5 * Math.random();
            const theta = Math.random() * 2 * Math.PI;
            const phi = Math.acos(2 * Math.random() - 1);
            pos.FIREWORKS.push(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );
        }

        // DNA (Double Helix)
        for (let i = 0; i < COUNT; i++) {
            const t = (i / COUNT) * 10 * Math.PI;
            const radius = 1.5;
            const x = radius * Math.cos(t);
            const y = (i / COUNT) * 8 - 4; // Height
            const z = radius * Math.sin(t);

            // Second strand offset by PI
            const isSecondStrand = i % 2 === 0;
            const offset = isSecondStrand ? Math.PI : 0;

            pos.DNA.push(
                radius * Math.cos(t + offset),
                y,
                radius * Math.sin(t + offset)
            );
        }

        // GALAXY (Spiral)
        for (let i = 0; i < COUNT; i++) {
            const arms = 5;
            const spin = i / COUNT * arms * Math.PI * 2;
            const r = (i / COUNT) * 4;
            const x = r * Math.cos(spin);
            const y = (Math.random() - 0.5) * 0.5; // Flat
            const z = r * Math.sin(spin);
            pos.GALAXY.push(x, y, z);
        }

        return pos;
    }, []);

    // Current particles state (x, y, z)
    const currentPositions = useMemo(() => new Float32Array(COUNT * 3), []);

    // Initialize current positions
    useEffect(() => {
        const startShape = positions[shapes[0]];
        for (let i = 0; i < COUNT * 3; i++) {
            currentPositions[i] = startShape[i];
        }
    }, [positions, currentPositions]);

    // Handle gesture shape switching
    useEffect(() => {
        if (gesture === 'OPEN_PALM') {
            setShapeIndex((prev) => (prev + 1) % shapes.length);
        }
    }, [gesture]);

    // Reusable objects to avoid GC
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const tempColor = useMemo(() => new THREE.Color(), []);
    const tempV3 = useMemo(() => new THREE.Vector3(), []);
    const tempDir = useMemo(() => new THREE.Vector3(), []);
    const tempSwirl = useMemo(() => new THREE.Vector3(), []);

    useFrame((state) => {
        if (!meshRef.current) return;

        const targetShapeName = shapes[shapeIndex];
        const targetPos = positions[targetShapeName];

        const time = state.clock.getElapsedTime();

        // Transform Hand Position to Local Space
        const handVWorld = new THREE.Vector3(handPosition[0] * 5, handPosition[1] * 3, 0);

        // Inverse transform logic
        const localHandV = handVWorld.clone()
            .sub(new THREE.Vector3(...shapePosition))
            .divideScalar(zoom)
            .applyEuler(new THREE.Euler(-rotation[0], -rotation[1], -rotation[2]));

        for (let i = 0; i < COUNT; i++) {
            const i3 = i * 3;

            // Interpolate to target with ease-out
            const lerpFactor = 0.08;
            currentPositions[i3] += (targetPos[i3] - currentPositions[i3]) * lerpFactor;
            currentPositions[i3 + 1] += (targetPos[i3 + 1] - currentPositions[i3 + 1]) * lerpFactor;
            currentPositions[i3 + 2] += (targetPos[i3 + 2] - currentPositions[i3 + 2]) * lerpFactor;

            // Organic Noise Movement
            const noise = Math.sin(time + i * 0.1) * 0.02;
            currentPositions[i3] += noise;
            currentPositions[i3 + 1] += Math.cos(time + i * 0.1) * 0.02;

            // Hand Interaction (using localHandV)
            tempV3.set(currentPositions[i3], currentPositions[i3 + 1], currentPositions[i3 + 2]);
            const dist = tempV3.distanceTo(localHandV);

            // Repel or Attract based on Pinch
            // Note: If dragging (Pinch), we might want to disable attract to avoid "sticking"
            // But user might want to drag AND swirl. Let's keep it for now.
            if (dist < 2.0) {
                tempDir.copy(tempV3).sub(localHandV).normalize();
                const force = (2.0 - dist) * 0.8;

                if (isPinching) {
                    // Attract/Swirl
                    tempSwirl.set(-tempDir.y, tempDir.x, 0).multiplyScalar(0.1);
                    currentPositions[i3] -= tempDir.x * force * 0.5;
                    currentPositions[i3 + 1] -= tempDir.y * force * 0.5;
                    currentPositions[i3 + 2] -= tempDir.z * force * 0.5;

                    currentPositions[i3] += tempSwirl.x;
                    currentPositions[i3 + 1] += tempSwirl.y;
                } else {
                    // Repel
                    currentPositions[i3] += tempDir.x * force;
                    currentPositions[i3 + 1] += tempDir.y * force;
                    currentPositions[i3 + 2] += tempDir.z * force;
                }
            }

            // Update Instance
            let scale = 1;
            if (isPinching) scale = 1.2 + Math.sin(time * 20 + i) * 0.5; // Vibrate

            dummy.position.set(currentPositions[i3], currentPositions[i3 + 1], currentPositions[i3 + 2]);
            dummy.scale.set(scale, scale, scale);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);

            // Color update
            // Dynamic color based on time and position
            const hueBase = (time * 0.1) % 1;

            if (targetShapeName === 'HEART') tempColor.setHSL(0.95, 0.8, 0.6);
            else if (targetShapeName === 'FLOWER') tempColor.setHSL(0.8, 0.8, 0.6);
            else if (targetShapeName === 'SATURN') tempColor.setHSL(0.1, 0.8, 0.6);
            else if (targetShapeName === 'FIREWORKS') tempColor.setHSL((i / COUNT + time * 0.2) % 1, 0.8, 0.6);
            else if (targetShapeName === 'DNA') tempColor.setHSL((currentPositions[i3 + 1] * 0.1 + 0.5), 0.8, 0.6);
            else if (targetShapeName === 'GALAXY') tempColor.setHSL((i / COUNT * 0.5 + 0.5), 0.8, 0.6);
            else tempColor.setHSL(0.6, 0.8, 0.8);

            if (isPinching) tempColor.setHSL((hueBase + 0.5) % 1, 1, 0.7); // Invert/Flash on pinch

            meshRef.current.setColorAt(i, tempColor);
        }
        meshRef.current.instanceMatrix.needsUpdate = true;
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    });

    return (
        <>
            <instancedMesh
                ref={meshRef}
                args={[null, null, COUNT]}
                position={shapePosition}
                rotation={rotation}
                scale={[zoom, zoom, zoom]}
            >
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshStandardMaterial
                    toneMapped={false}
                    emissive="white"
                    emissiveIntensity={2}
                    color="white"
                />
            </instancedMesh>
            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} radius={0.6} />
            </EffectComposer>
        </>
    );
};

export default ParticleSystem;
