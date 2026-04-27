/* eslint-disable react-hooks/immutability -- three.js textures are mutable GPU resources. */

import { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

type TextureTier = 'none' | 'low' | 'high';

interface ProgressiveTextureOptions {
  lowSrc?: string | null;
  highSrc?: string | null;
  loadHigh?: boolean;
  colorSpace?: THREE.ColorSpace;
}

interface ProgressiveTextureResult {
  texture: THREE.Texture | null;
  tier: TextureTier;
}

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();
const pendingTextureLoads = new Map<string, Promise<THREE.Texture>>();

function configureTexture(
  texture: THREE.Texture,
  gl: THREE.WebGLRenderer,
  colorSpace: THREE.ColorSpace,
): THREE.Texture {
  texture.colorSpace = colorSpace;
  texture.anisotropy = Math.min(16, gl.capabilities.getMaxAnisotropy());
  texture.needsUpdate = true;
  return texture;
}

function loadTexture(src: string): Promise<THREE.Texture> {
  const cached = textureCache.get(src);
  if (cached) return Promise.resolve(cached);

  const pending = pendingTextureLoads.get(src);
  if (pending) return pending;

  const nextLoad = new Promise<THREE.Texture>((resolve, reject) => {
    textureLoader.load(
      src,
      (texture) => {
        textureCache.set(src, texture);
        pendingTextureLoads.delete(src);
        resolve(texture);
      },
      undefined,
      (error) => {
        pendingTextureLoads.delete(src);
        reject(error);
      },
    );
  });

  pendingTextureLoads.set(src, nextLoad);
  return nextLoad;
}

export function useProgressiveTexture({
  lowSrc,
  highSrc,
  loadHigh = false,
  colorSpace = THREE.SRGBColorSpace,
}: ProgressiveTextureOptions): ProgressiveTextureResult {
  const { gl } = useThree();
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [tier, setTier] = useState<TextureTier>('none');
  const tierRef = useRef<TextureTier>('none');

  useEffect(() => {
    tierRef.current = tier;
  }, [tier]);

  useEffect(() => {
    if (!lowSrc) return;
    let cancelled = false;

    loadTexture(lowSrc)
      .then((loaded) => {
        if (cancelled || tierRef.current === 'high') return;
        setTexture(configureTexture(loaded, gl, colorSpace));
        setTier('low');
      })
      .catch((error) => {
        console.warn(`[texture] Failed to load low-res texture "${lowSrc}"`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [lowSrc, gl, colorSpace]);

  useEffect(() => {
    if (!loadHigh || !highSrc) return;
    let cancelled = false;

    loadTexture(highSrc)
      .then((loaded) => {
        if (cancelled) return;
        setTexture(configureTexture(loaded, gl, colorSpace));
        setTier('high');
      })
      .catch((error) => {
        console.warn(`[texture] Failed to load high-res texture "${highSrc}"`, error);
      });

    return () => {
      cancelled = true;
    };
  }, [highSrc, loadHigh, gl, colorSpace]);

  return { texture, tier };
}
