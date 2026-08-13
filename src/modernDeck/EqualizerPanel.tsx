"use client";

import { EQ_BANDS } from "../PlayerProvider";

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [5, 4, 2, 0, -1, 0, 2, 4, 4, 5],
  Vocal: [-2, -1, 1, 3, 4, 4, 3, 1, 0, -1],
  Bass: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  Treble: [-2, -2, -1, 0, 1, 3, 5, 6, 6, 6],
  Classical: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
  Dance: [6, 5, 2, 0, 0, -2, -3, -3, 0, 0],
  Loudness: [6, 4, 0, 0, -2, 0, -1, -4, 5, 1],
};

export function eqBandLabel(hz: number): string {
  return hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
}

export function EqualizerPanel({
  id,
  eqGains,
  eqPreset,
  persist,
  setEqGain,
  setEqGains,
  setEqPreset,
}: {
  id: string;
  eqGains: number[];
  eqPreset: string | null;
  persist: (patch: Record<string, unknown>) => void;
  setEqGain: (band: number, db: number) => void;
  setEqGains: (gains: number[]) => void;
  setEqPreset: (preset: string | null) => void;
}) {
  return (
    <div id={id} className="deck-eq-panel" role="region" aria-label="Equalizer">
      <div className="deck-eq-presets">
        {Object.keys(EQ_PRESETS).map((name) => (
          <button
            key={name}
            type="button"
            className={`deck-eq-preset${eqPreset === name ? " is-active" : ""}`}
            aria-pressed={eqPreset === name}
            onClick={() => {
              const gains = EQ_PRESETS[name];
              setEqGains(gains);
              setEqPreset(name);
              persist({ eq: gains, eqPreset: name });
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="deck-eq-bands">
        {EQ_BANDS.map((hz, i) => (
          <div key={hz} className="deck-eq-band">
            <span className="deck-eq-slot">
              <input
                className="deck-eq-slider"
                type="range"
                min={-12}
                max={12}
                step={1}
                value={eqGains[i] ?? 0}
                onChange={(e) => {
                  const db = Number(e.target.value);
                  setEqGain(i, db);
                  const next = eqGains.slice();
                  next[i] = db;
                  setEqPreset(null);
                  persist({ eq: next, eqPreset: null });
                }}
                aria-label={`${eqBandLabel(hz)} Hz equalizer`}
                aria-valuetext={`${eqGains[i] ?? 0} decibels`}
              />
            </span>
            <span className="deck-eq-hz" aria-hidden="true">
              {eqBandLabel(hz)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
