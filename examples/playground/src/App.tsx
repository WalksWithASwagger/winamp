import { useState } from "react";
import {
  PlayerProvider,
  WinampPlayer,
  type DeckTheme,
} from "@walkswithaswagger/winamp";
import "@walkswithaswagger/winamp/styles.css";
import "@walkswithaswagger/winamp/skins.css";
import "./hub.css";
import { STATIONS } from "./tracks";

// Graphic skins (imagery + pixel font + scanlines) vs. palette-only themes.
const GRAPHIC_SKINS: Array<{ label: string; value: DeckTheme }> = [
  { label: "Ghost", value: "ghost" },
  { label: "Terminal", value: "terminal" },
  { label: "CRT Amber", value: "crt-amber" },
];
const COLOR_THEMES: Array<{ label: string; value: DeckTheme | "default" }> = [
  { label: "Default", value: "default" },
  { label: "Green", value: "green" },
  { label: "Vaporwave", value: "vaporwave" },
  { label: "Mono", value: "mono" },
  { label: "Amber", value: "amber" },
  { label: "Sunset", value: "sunset" },
  { label: "Ice", value: "ice" },
  { label: "Crimson", value: "crimson" },
];

export function App() {
  const [theme, setTheme] = useState<DeckTheme | "default">("ghost");
  const [stationId, setStationId] = useState("gorgeous-ghost");

  const idx = Math.max(
    0,
    STATIONS.findIndex((s) => s.id === stationId),
  );
  const active = STATIONS[idx] ?? STATIONS[STATIONS.length - 1];
  // Needle position across the dial (centered over the active stop).
  const needle = ((idx + 0.5) / STATIONS.length) * 100;

  return (
    <main className="station">
      {/* one-shot static flash on each re-tune (remounts via key) */}
      <div key={stationId} className="tune-flash" aria-hidden="true" />

      <header className="topbar">
        <span className="topbar-id">ghost.radio.fm — kris krüg / audio lab</span>
        <span className="tally">on air</span>
      </header>

      <div className="console">
        {/* ---- left: identity + tuner + now-playing ---- */}
        <div className="col-left">
          <div className="identity">
            <h1 className="callsign">
              GHOST<b>·</b>RADIO
            </h1>
            <p className="tagline">
              A pirate signal for <b>AI music, half-finished albums, and a
              Winamp that still rips.</b>
            </p>
          </div>

          <section className="tuner" aria-label="Station tuner">
            <span className="panel-label">The dial · tune the deck</span>
            <div className="tuner-scale">
              <span className="tuner-needle" style={{ left: `${needle}%` }} />
              {STATIONS.map((s) => {
                const tuned = s.id === active.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`tuner-stop${tuned ? " is-tuned" : ""}`}
                    aria-pressed={tuned}
                    onClick={() => setStationId(s.id)}
                  >
                    <span className="tuner-freq">{s.freq}</span>
                    <span className="tuner-name">{s.name}</span>
                  </button>
                );
              })}
            </div>
            {active.href && (
              <a
                className="tuner-site"
                href={active.href}
                target="_blank"
                rel="noreferrer"
              >
                visit {active.name.toLowerCase()} ↗
              </a>
            )}
          </section>

          <section className="nowplaying">
            <span className="panel-label">
              Now broadcasting · {active.freq} {active.name}
              <span className="np-count">{active.collection.length} tracks</span>
            </span>
            <ol className="np-list">
              {active.collection.map((t) => (
                <li key={t.id}>
                  <span className="np-n">
                    {String(t.number).padStart(2, "0")}
                  </span>
                  <span className="np-t">{t.title}</span>
                  <span className="np-bpm">{t.bpm ? `${t.bpm}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* ---- right: the deck dock (the deck floats into this frame) ---- */}
        <div className="col-right">
          <section className="deck-dock">
            <span className="panel-label">// the deck</span>
            <p className="dock-hint">
              Floats free — drag it, pop the EQ &amp; visualizer, blow out the
              bass.
            </p>
            <label className="skin-dial" htmlFor="skin">
              skin
              <select
                id="skin"
                value={theme}
                onChange={(e) =>
                  setTheme(e.target.value as DeckTheme | "default")
                }
              >
                <optgroup label="Skins">
                  {GRAPHIC_SKINS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Color themes">
                  {COLOR_THEMES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          </section>
        </div>
      </div>

      <footer className="bottombar">
        <span className="bb-about">
          open-source Winamp for React — real EQ, Milkdrop visualizer, a
          skinnable deck.
        </span>
        <nav className="bb-links">
          <a href="/classic">Classic ↗</a>
          <a href="https://github.com/WalksWithASwagger/winamp">GitHub</a>
          <a href="https://www.npmjs.com/package/@walkswithaswagger/winamp">
            npm
          </a>
        </nav>
        <span className="bb-copy">© 2026 Kris Krüg · ghost.radio.fm</span>
      </footer>

      {/* the floating deck — position:fixed, nudged into the dock via hub.css */}
      <PlayerProvider key={active.id} tracks={active.collection}>
        <WinampPlayer
          wordmarkText="GHOST RADIO"
          theme={theme === "default" ? undefined : theme}
        />
      </PlayerProvider>
    </main>
  );
}
