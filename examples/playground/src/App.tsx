import { useState } from "react";
import {
  PlayerProvider,
  WinampPlayer,
  type DeckTheme,
} from "@walkswithaswagger/winamp";
import "@walkswithaswagger/winamp/styles.css";
import "./hub.css";
import { gorgeousGhost } from "./tracks";
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

// Other transmissions — Kris's music projects, presented as dial presets.
const FREQUENCIES: Array<{
  num: string;
  name: string;
  desc: string;
  href?: string;
}> = [
  {
    num: "88.1",
    name: "BOTH HANDS FULL",
    desc: "The record — plus the Too Weird to Die album.",
    href: "https://bothhandsfull.com",
  },
  {
    num: "92.3",
    name: "ETHOS BLOCK PARTY",
    desc: "Song booth — make a track, join the party.",
    href: "https://ethosblockparty.com",
  },
  {
    num: "100.7",
    name: "GORGEOUS GHOST",
    desc: "The album — landing soon. (It's what's on the deck.)",
  },
];

export function App() {
  const [theme, setTheme] = useState<DeckTheme | "default">("ghost");

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
          The deck floats top-right — drag it anywhere, pop the EQ and the
          visualizer, blow out the bass. Tonight's set:
        </p>
        <ol className="setlist">
          {gorgeousGhost.map((t) => (
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
        {/* The deck is position:fixed — it floats over the whole page. The
            Ghost skin now ships in the library (theme="ghost"), so no app-side
            CSS/logo override is needed. */}
        <PlayerProvider tracks={gorgeousGhost}>
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

      {/* ---- other frequencies: link-out stations ---- */}
      <section className="band">
        <h2 className="band-label">Other frequencies</h2>
        <nav className="frequencies">
          {FREQUENCIES.map((f) => (
            <a
              key={f.num}
              className="freq"
              href={f.href ?? "#"}
              aria-disabled={f.href ? undefined : "true"}
              target={f.href ? "_blank" : undefined}
              rel={f.href ? "noreferrer" : undefined}
            >
              <span className="freq-num">{f.num}</span>
              <span>
                <span className="freq-name">{f.name}</span>
                <span className="freq-desc">{f.desc}</span>
              </span>
              <span className="freq-go">{f.href ? "tune in →" : "soon"}</span>
            </a>
          ))}
        </nav>
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
