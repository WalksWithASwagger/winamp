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
import { ClassicSkinDemo } from "./ClassicSkinDemo";

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
  // Which station the deck is tuned to. Default to the namesake.
  const [stationId, setStationId] = useState("gorgeous-ghost");
  const active =
    STATIONS.find((s) => s.id === stationId) ?? STATIONS[STATIONS.length - 1];

  return (
    <main className="station">
      <header className="dial">
        <span>ghost.radio.fm — kris krüg / audio lab</span>
        <span className="tally">on air</span>
      </header>

      <h1 className="callsign">
        GHOST<b>·</b>RADIO
      </h1>
      <p className="tagline">
        A pirate signal for <b>AI music, half-finished albums, and a Winamp
        that still rips.</b> Tune in, drag the deck around, blow out the EQ.
      </p>

      {/* ---- now broadcasting: the floating deck plays this set ---- */}
      <section className="band">
        <h2 className="band-label">Now broadcasting</h2>
        <p className="now-hint">
          Tuned to <b>{active.freq} · {active.name}</b> — tune another station
          below. The deck floats top-right: drag it, pop the EQ and visualizer,
          blow out the bass.
        </p>
        <ol className="setlist">
          {active.collection.map((t) => (
            <li key={t.id}>
              <span className="set-n">
                {String(t.number).padStart(2, "0")}
              </span>
              <span className="set-t">{t.title}</span>
              <span className="set-bpm">{t.bpm ? `${t.bpm} bpm` : ""}</span>
            </li>
          ))}
        </ol>
        <div className="skin-dial">
          <label htmlFor="skin">deck skin</label>
          <select
            id="skin"
            value={theme}
            onChange={(e) => setTheme(e.target.value as DeckTheme | "default")}
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
        </div>
        {/* The deck is position:fixed — it floats over the whole page. Keying
            by station id remounts the engine when you tune to a new album. */}
        <PlayerProvider key={active.id} tracks={active.collection}>
          <WinampPlayer
            wordmarkText="GHOST RADIO"
            theme={theme === "default" ? undefined : theme}
          />
        </PlayerProvider>
      </section>

      {/* ---- transmission log: about the player ---- */}
      <section className="band">
        <h2 className="band-label">Transmission log</h2>
        <div className="prose">
          <p>
            This deck is <b>open source</b> — a draggable, skinnable Winamp for
            React with a real 10-band EQ, a Milkdrop/Butterchurn visualizer, and
            an engine that loads authentic <code>.wsz</code> skins. It's the same
            player you're hearing right now.
          </p>
          <p className="muted">
            Pull it into your own site:{" "}
            <a href="https://github.com/WalksWithASwagger/winamp">
              github.com/WalksWithASwagger/winamp
            </a>{" "}
            ·{" "}
            <a href="https://www.npmjs.com/package/@walkswithaswagger/winamp">
              npm i @walkswithaswagger/winamp
            </a>
          </p>
        </div>
      </section>

      {/* ---- the dial: tune the deck to a station ---- */}
      <section className="band">
        <h2 className="band-label">The dial · tune the deck</h2>
        <ul className="frequencies">
          {STATIONS.map((s) => {
            const tuned = s.id === active.id;
            return (
              <li key={s.id} className={`freq${tuned ? " is-tuned" : ""}`}>
                <button
                  type="button"
                  className="freq-tune"
                  aria-pressed={tuned}
                  onClick={() => setStationId(s.id)}
                >
                  <span className="freq-num">{s.freq}</span>
                  <span>
                    <span className="freq-name">{s.name}</span>
                    <span className="freq-desc">
                      {s.desc} · {s.collection.length} tracks
                    </span>
                  </span>
                  <span className="freq-go">{tuned ? "▶ tuned" : "tune ▸"}</span>
                </button>
                {s.href && (
                  <a
                    className="freq-site"
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    site ↗
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- classic-skin showcase: the real .wsz engine ---- */}
      <section className="band">
        <h2 className="band-label">Classic booth · real .wsz skins</h2>
        <div className="prose" style={{ marginBottom: "1.25rem" }}>
          <p className="muted">
            The same engine, wearing real Winamp 2 skins — main, EQ, and playlist
            windows. Switch skins live.
          </p>
        </div>
        <div className="booth">
          <ClassicSkinDemo />
        </div>
      </section>

      <footer className="colophon">
        <span>© 2026 Kris Krüg</span>
        <a href="https://github.com/WalksWithASwagger/winamp">source</a>
        <span>built with the ghost radio deck</span>
        <span>ghost.radio.fm</span>
      </footer>
    </main>
  );
}
