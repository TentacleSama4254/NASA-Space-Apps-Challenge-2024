/**
 * PlanetLabel
 *
 * Renders a small coloured ring + dot + name tag above each planet.
 * The dot colour is supplied directly from the body registry (dotColor prop)
 * to avoid the expensive runtime extractColors() call that previously fetched
 * and decoded the full planet texture just to pick a colour.
 */

import React, { useRef } from 'react';
import { Html } from '@react-three/drei';
import { Vector3 } from 'three';
import * as THREE from 'three';

interface PlanetLabelProps {
  position: number[];
  label: string;
  /** Pre-computed hex color string from the body registry. */
  dotColor: string;
  opacity: number;
  onClick?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  occlude?: any[];
}

const PlanetLabel: React.FC<PlanetLabelProps> = ({
  position,
  label,
  dotColor,
  opacity,
  onClick,
  occlude,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <Html
      position={position ? new Vector3(...position) : undefined}
      style={{ pointerEvents: 'auto', opacity }}
      ref={ref}
      occlude={occlude}
    >
      <div style={{ position: 'relative' }} onClick={onClick}>
        {/* Outer ring */}
        <div
          style={{
            width: 10,
            height: 10,
            border: `1.7px solid ${dotColor}`,
            borderRadius: '50%',
            position: 'absolute',
            left: 0,
            top: 0,
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner dot */}
          <div
            style={{
              width: 4,
              height: 4,
              backgroundColor: dotColor,
              borderRadius: '50%',
            }}
          />
        </div>
        {/* Name */}
        <span
          style={{
            marginLeft: 10,
            color: '#bbbbbb',
            position: 'absolute',
            left: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            fontFamily: "'Space Mono', monospace",
            userSelect: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>
      </div>
    </Html>
  );
};

export default PlanetLabel;
