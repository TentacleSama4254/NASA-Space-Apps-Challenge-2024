import React, { useMemo, useRef, useState } from 'react';
import { useSimClock } from '../../context/SimulationClock';

const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZoneName: 'short',
});

function formatSpeed(scale: number): string {
  if (scale < 1000) return `${scale.toFixed(0)}x`;
  return `${scale.toLocaleString(undefined, { maximumFractionDigits: 0 })}x`;
}

function formatRate(scale: number): string {
  const simDaysPerSecond = scale / 86_400;
  if (simDaysPerSecond < 1) {
    return `${(simDaysPerSecond * 24).toFixed(2)} sim hr/s`;
  }
  return `${simDaysPerSecond.toFixed(2)} sim days/s`;
}

const buttonStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: 0,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.08)',
  color: 'rgba(255,255,255,0.84)',
  cursor: 'pointer',
  fontFamily: "'Space Mono', monospace",
  fontSize: 18,
  lineHeight: 1,
};

const SimulationHud: React.FC = () => {
  const clock = useSimClock();
  const [displayTime, setDisplayTime] = useState(() => clock?.getSimTimeMs() ?? Date.now());
  const lastUpdate = useRef(0);

  React.useEffect(() => {
    if (!clock) return;

    const intervalId = window.setInterval(() => {
      const now = performance.now();
      if (now - lastUpdate.current < 250) return;
      lastUpdate.current = now;
      setDisplayTime(clock.getSimTimeMs());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [clock]);

  const dateText = useMemo(() => DATE_FORMATTER.format(new Date(displayTime)), [displayTime]);
  const speedText = clock ? formatSpeed(clock.timeScale) : '1x';
  const rateText = clock ? formatRate(clock.timeScale) : '1 sim sec/s';

  const setSpeed = (nextScale: number) => {
    clock?.setTimeScale(Math.min(7_776_000, Math.max(1, Math.round(nextScale))));
  };

  return (
    <div style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'fixed',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 60,
          color: 'rgba(255,255,255,0.86)',
          fontFamily: "'Space Mono', monospace",
          fontSize: 13,
          letterSpacing: '0.04em',
          textShadow: '0 1px 10px rgba(0,0,0,0.92)',
          whiteSpace: 'nowrap',
        }}
      >
        {dateText}
      </div>

      <div
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 88,
          transform: 'translateX(-50%)',
          zIndex: 60,
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 999,
          border: '1px solid rgba(255,255,255,0.1)',
          background: 'linear-gradient(135deg, rgba(44,44,44,0.82), rgba(8,8,8,0.92))',
          boxShadow: '0 16px 36px rgba(0,0,0,0.38)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <button
          type="button"
          title="Slow time"
          style={buttonStyle}
          onClick={() => clock && setSpeed(clock.timeScale / 2)}
        >
          -
        </button>
        <div
          style={{
            minWidth: 138,
            textAlign: 'center',
            color: 'rgba(255,255,255,0.84)',
            fontFamily: "'Space Mono', monospace",
            fontSize: 11,
            lineHeight: 1.25,
            whiteSpace: 'nowrap',
          }}
        >
          <div>{speedText}</div>
          <div style={{ color: 'rgba(255,255,255,0.48)' }}>{rateText}</div>
        </div>
        <button
          type="button"
          title="Speed time"
          style={buttonStyle}
          onClick={() => clock && setSpeed(clock.timeScale * 2)}
        >
          +
        </button>
      </div>
    </div>
  );
};

export default SimulationHud;
