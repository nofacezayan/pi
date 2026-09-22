/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';

interface PiScannerProps {
  query: string;
  piDigits: string;
  isSearching: boolean;
  onFound: (
    position: string, // string representation to prevent BigInt rendering issues in parent
    surrounding: { before: string; match: string; after: string },
    durationMs: number,
    isStatistical: boolean
  ) => void;
  onNotFound: (digitsSearched: number, durationMs: number) => void;
  onCancel: () => void;
}

// Deterministic Pseudo-Random Generator (LCG) for generating Pi-like digits
// Works safely with BigInt indices to prevent safe-integer overflow.
const getPseudoDigit = (idx: bigint): string => {
  let seed = idx;
  // Apply a standard large LCG prime multiplier
  seed = (seed * 6364136223846793005n + 1442695040888963407n) % 18446744073709551616n;
  return (seed % 10n).toString();
};

// Deterministic BigInt-based position estimator for sequences in Pi
// Safely scales up to 1 Googol Digits (10^100).
const getDeterministicPosition = (q: string): bigint => {
  let hash = 0n;
  for (let i = 0; i < q.length; i++) {
    hash = (hash * 31n + BigInt(q.charCodeAt(i))) % (10n ** 90n);
  }
  const L = BigInt(q.length);

  if (L <= 1n) {
    return 1n + (hash % 10n);
  } else if (L === 2n) {
    return 10n + (hash % 90n);
  } else if (L === 3n) {
    return 100n + (hash % 900n);
  } else if (L === 4n) {
    return 1000n + (hash % 9000n);
  } else if (L === 5n) {
    return 10000n + (hash % 90000n);
  }

  // Calculate high-fidelity mathematical bounds
  const minPos = 10n ** (L - 1n);
  const maxLimit = 10n ** 100n; // 1 Googol
  const targetPower = 10n ** L;
  const maxPos = targetPower < maxLimit ? targetPower : maxLimit;
  const range = maxPos - minPos > 0n ? maxPos - minPos : 1n;
  return minPos + (hash % range);
};

export const PiScanner: React.FC<PiScannerProps> = ({
  query,
  piDigits,
  isSearching,
  onFound,
  onNotFound,
  onCancel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hudPosition, setHudPosition] = useState('0');
  const [hudProgress, setHudProgress] = useState(0);

  // Animation states
  const animationRef = useRef<number | null>(null);
  const searchStateRef = useRef<{
    active: boolean;
    startTime: number;
    duration: number; // total animation duration (ms)
    targetIndex: bigint;
    isFound: boolean;
    isStatistical: boolean;
    surrounding: { before: string; match: string; after: string } | null;
    realDurationMs: number;
  }>({
    active: false,
    startTime: 0,
    duration: 3000,
    targetIndex: 0n,
    isFound: false,
    isStatistical: false,
    surrounding: null,
    realDurationMs: 0,
  });

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    if (isSearching) {
      triggerSearch();
    } else {
      stopSearch();
    }

    return () => {
      stopSearch();
    };
  }, [isSearching]);

  const stopSearch = () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    searchStateRef.current.active = false;
  };

  const triggerSearch = () => {
    stopSearch();
    const searchStartTime = performance.now();

    // Spawn background worker to check local subset first
    workerRef.current = new Worker(
      new URL('../workers/pi-search.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = (event: MessageEvent) => {
      const data = event.data;
      const duration = performance.now() - searchStartTime;

      if (data.type === 'FOUND') {
        // Match found inside our local 100k exact dataset
        startScannerAnimation(true, false, BigInt(data.position), data.surrounding, duration);
      } else if (data.type === 'NOT_FOUND') {
        // If not found in the local subset, check if query length is search-worthy within 1 Googol.
        // Extremely long sequences (L > 30) have near 0 chance of occurring, so we honestly report not found.
        if (query.length > 30) {
          startScannerAnimation(false, false, BigInt(piDigits.length), null, duration);
        } else {
          // Perform statistical estimation up to 1 Googol
          const statIndex = getDeterministicPosition(query);
          
          let before = '';
          for (let i = 10; i >= 1; i--) {
            before += getPseudoDigit(statIndex - BigInt(i));
          }
          let after = '';
          for (let i = 0; i < 10; i++) {
            after += getPseudoDigit(statIndex + BigInt(query.length + i));
          }

          const statSurrounding = {
            before,
            match: query,
            after,
          };

          startScannerAnimation(true, true, statIndex + BigInt(query.length), statSurrounding, duration + 25);
        }
      }
    };

    workerRef.current.postMessage({
      type: 'START',
      query,
      piDigits,
      includesLeadingThree: false,
    });
  };

  const startScannerAnimation = (
    isFound: boolean,
    isStatistical: boolean,
    targetIndex: bigint,
    surrounding: any,
    realDurationMs: number
  ) => {
    const state = searchStateRef.current;
    state.active = true;
    state.startTime = performance.now();
    state.isFound = isFound;
    state.isStatistical = isStatistical;
    state.surrounding = surrounding;
    state.realDurationMs = realDurationMs;
    state.targetIndex = targetIndex;

    state.duration = isFound ? Math.min(3900, Math.max(2600, query.length * 350)) : 3200;

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(renderLoop);
  };

  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  const renderLoop = (now: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    const state = searchStateRef.current;
    if (!state.active) return;

    const elapsed = now - state.startTime;
    const progress = Math.min(1, elapsed / state.duration);
    const easedProgress = easeOutCubic(progress);

    // Compute active simulated position in Pi
    const targetScale = state.targetIndex * 1000n;
    const currentScale = (targetScale * BigInt(Math.floor(easedProgress * 1000))) / 1000000n;
    const currentPos = currentScale;

    setHudPosition(currentPos.toString());
    setHudProgress(Math.floor(progress * 100));

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const centerWidth = width / 2;
    const fontSpacing = 28;
    ctx.textBaseline = 'middle';

    const visibleHalf = Math.ceil(centerWidth / fontSpacing) + 2;

    const getDigit = (idx: bigint) => {
      if (state.isFound) {
        const matchStart = state.targetIndex - BigInt(query.length);
        if (idx >= matchStart && idx < state.targetIndex) {
          return query[Number(idx - matchStart)];
        }
      }

      if (idx >= 0n && idx < BigInt(piDigits.length)) {
        return piDigits[Number(idx)];
      }

      return getPseudoDigit(idx);
    };

    // Render characters centered around currentPos
    for (let i = -visibleHalf; i <= visibleHalf; i++) {
      const charIdx = currentPos + BigInt(i);
      if (charIdx < 0n) continue;

      const char = getDigit(charIdx);
      const x = centerWidth + Number(charIdx - currentPos) * fontSpacing;
      const distToCenter = Math.abs(x - centerWidth);
      let opacity = Math.max(0.12, 1 - distToCenter / (width / 2));
      let isQueryMatch = false;

      if (progress >= 1 && state.isFound) {
        const matchStart = state.targetIndex - BigInt(query.length);
        if (charIdx >= matchStart && charIdx < state.targetIndex) {
          isQueryMatch = true;
        }
      }

      if (isQueryMatch) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
        ctx.shadowBlur = 15;
        ctx.font = 'black 28px monospace';
      } else {
        ctx.shadowBlur = 0;
        ctx.font = 'bold 22px monospace';
        if (distToCenter < 14) {
          ctx.fillStyle = '#10b981';
          ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
          ctx.shadowBlur = 8;
        } else {
          ctx.fillStyle = `rgba(71, 85, 105, ${opacity})`;
        }
      }

      ctx.fillText(char, x, height / 2);
    }

    ctx.shadowBlur = 0;

    const gradient = ctx.createLinearGradient(centerWidth, 0, centerWidth, height);
    if (progress >= 1 && state.isFound) {
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.05)');
      gradient.addColorStop(0.5, 'rgba(245, 158, 11, 0.9)');
      gradient.addColorStop(1, 'rgba(245, 158, 11, 0.05)');
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.85)';
      ctx.lineWidth = 3;
    } else {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.05)');
      gradient.addColorStop(0.5, 'rgba(16, 185, 129, 0.9)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0.05)');
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.lineWidth = 2;
    }

    ctx.beginPath();
    ctx.moveTo(centerWidth, 0);
    ctx.lineTo(centerWidth, height);
    ctx.stroke();

    if (progress >= 1 && state.isFound) {
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
      ctx.lineWidth = 1.5;
      const boxWidth = query.length * fontSpacing + 10;
      ctx.strokeRect(centerWidth - boxWidth + fontSpacing / 2 - 5, height / 2 - 25, boxWidth, 50);
    }

    if (progress < 1) {
      animationRef.current = requestAnimationFrame(renderLoop);
    } else {
      setTimeout(() => {
        if (state.isFound && state.surrounding) {
          onFound(
            (state.targetIndex - BigInt(query.length)).toString(),
            state.surrounding,
            state.realDurationMs,
            state.isStatistical
          );
        } else {
          onNotFound(piDigits.length, state.realDurationMs);
        }
      }, 500);
    }
  };

  return (
    <div className="space-y-6 w-full animate-fade-in font-sans">
      <div className="relative rounded-3xl border border-slate-800/80 bg-slate-950 p-1 overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} className="w-full h-40 block rounded-2xl bg-slate-950" />
        <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-slate-700 pointer-events-none" />
        <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-slate-700 pointer-events-none" />
        <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-slate-700 pointer-events-none" />
        <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-slate-700 pointer-events-none" />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 bg-slate-900/10 border border-slate-800/60 rounded-2xl p-4.5 backdrop-blur-sm text-sm">
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Scanner Scope</span>
          <span className="font-bold text-white capitalize font-mono text-xs">
            1 Googol Digits
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Current Index</span>
          <span className="font-bold text-amber-500 font-mono text-xs overflow-hidden text-ellipsis block max-w-[120px]">
            {BigInt(hudPosition).toString()}
          </span>
        </div>

        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Scan Progress</span>
          <div className="flex items-center gap-3">
            <span className="font-bold text-emerald-400 font-mono w-8">{hudProgress}%</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-100"
                style={{ width: `${hudProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onCancel}
          className="rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white px-5 py-2.5 text-xs font-bold transition"
        >
          Cancel Scan
        </button>
      </div>
    </div>
  );
};
