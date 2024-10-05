import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Keplerian orbital propagation functions translated to JavaScript
const KeplerStart3 = (e, M) => {
  const t34 = e ** 2;
  const t35 = e * t34;
  const t33 = Math.cos(M);

  return (
    M + ((-1 / 2) * t35 + e + (t34 + (3 / 2) * t33 * t35) * t33) * Math.sin(M)
  );
};

const eps3 = (e, M, x) => {
  const t1 = Math.cos(x);
  const t2 = -1 + e * t1;
  const t3 = Math.sin(x);
  const t4 = e * t3;
  const t5 = -x + t4 + M;
  const t6 = t5 / (((1 / 2) * t5 * t4) / t2 + t2);
  return t5 / (((1 / 2) * t3 - (1 / 6) * t1 * t6) * e * t6 + t2);
};

const KeplerSolve = (e, M) => {
  const tol = 1.0e-14;
  const Mnorm = M % (2 * Math.PI);
  let E0 = KeplerStart3(e, Mnorm);
  let dE = tol + 1;
  let count = 0;

  while (dE > tol) {
    const E = E0 - eps3(e, Mnorm, E0);
    dE = Math.abs(E - E0);
    E0 = E;
    count += 1;

    if (count === 100) {
      console.error("Astounding! KeplerSolve failed to converge!");
      break;
    }
  }

  return E0;
};

const propagate = (clock, a, e, inclination, omega, raan) => {
  const T = 120; // seconds
  const n = (2 * Math.PI) / T;
  const tau = 0; // time of pericenter passage

  const M = n * (clock - tau);
  const E = KeplerSolve(e, M);
  const cose = Math.cos(E);

  const r = a * (1 - e * cose);
  const s_x = r * ((cose - e) / (1 - e * cose));
  const s_y = r * ((Math.sqrt(1 - e ** 2) * Math.sin(E)) / (1 - e * cose));
  const s_z = 0;

  // Apply rotations (pitch, yaw, roll)
  const point = new THREE.Vector3(s_x, s_y, s_z);
  point.applyAxisAngle(new THREE.Vector3(0, 1, 0), inclination); // Pitch
  point.applyAxisAngle(new THREE.Vector3(0, 0, 1), omega); // Yaw
  point.applyAxisAngle(new THREE.Vector3(1, 0, 0), raan); // Roll

  return point;
};

const Test = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;

    const geometry = new THREE.SphereGeometry(0.1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const planet = new THREE.Mesh(geometry, material);
    scene.add(planet);

    // Create the orbital path
    const orbitGeometry = new THREE.BufferGeometry();
    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      linewidth: 1,
    });
    const orbitVertices = [];

    // Parameters from the provided data
    const a = (1.190641555 + 5.95) / 2; // Semi-major axis (average of q_au_1 and q_au_2)
    const e = 0.6663127807; // Eccentricity
    const inclination = THREE.MathUtils.degToRad(15.1007464); // Inclination in radians
    const omega = THREE.MathUtils.degToRad(203.6490232); // Argument of periapsis in radians
    const raan = THREE.MathUtils.degToRad(111.3920029); // Right Ascension of the Ascending Node in radians
    const q = -4.375; // Perihelion distance in AU
    let clock = 0;

    // Increase the resolution by increasing the number of steps
    const steps = 1000; // Number of steps for higher resolution
    for (let t = 0; t <= 120; t += 120 / steps) {
      const point = propagate(t, a, e, inclination, omega, raan);
      orbitVertices.push(point.x, point.y, point.z);
    }

    orbitGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(orbitVertices, 3)
    );
    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    scene.add(orbitLine);

    // Calculate the position of the perihelion
    const perihelionPoint = new THREE.Vector3(q, 0, 0);
    perihelionPoint.applyAxisAngle(new THREE.Vector3(0, 1, 0), inclination); // Pitch
    perihelionPoint.applyAxisAngle(new THREE.Vector3(0, 0, 1), omega); // Yaw
    perihelionPoint.applyAxisAngle(new THREE.Vector3(1, 0, 0), raan); // Roll

    const perihelionGeometry = new THREE.SphereGeometry(0.05, 32, 32);
    const perihelionMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const perihelionMarker = new THREE.Mesh(
      perihelionGeometry,
      perihelionMaterial
    );
    perihelionMarker.position.set(
      perihelionPoint.x,
      perihelionPoint.y,
      perihelionPoint.z
    );
    scene.add(perihelionMarker);

    // Center the camera orbit around the perihelion point
    controls.target.set(
      perihelionPoint.x,
      perihelionPoint.y,
      perihelionPoint.z
    );
    camera.position.set(
      perihelionPoint.x + 5,
      perihelionPoint.y + 5,
      perihelionPoint.z + 5
    );
    controls.update();

    const animate = function () {
      requestAnimationFrame(animate);

      // Update clock
      clock += 1;
      if (clock > 120) clock = 0;

      // Calculate new position
      const point = propagate(clock, a, e, inclination, omega, raan);
      planet.position.set(point.x, point.y, point.z);

      controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} />;
};

export default Test;
