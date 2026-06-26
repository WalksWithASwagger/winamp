import { useState } from "react";
import { PlayerProvider, WinampPlayer } from "@walkswithaswagger/winamp";
import "@walkswithaswagger/winamp/styles.css";
import { collections } from "./tracks";
import { ClassicSkinDemo } from "./ClassicSkinDemo";

export function App() {
  const [active, setActive] = useState(collections[0]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#13101a",
        color: "#c8bdd7",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        padding: "2rem",
      }}
    >
      <h1 style={{ fontSize: "1.25rem", margin: "0 0 0.25rem" }}>
        Winamp Deck — Playground
      </h1>
      <p style={{ margin: "0 0 1.5rem", color: "#8c819b", fontSize: "0.85rem" }}>
        Local dev harness. Switch collections, drag the deck, open the EQ /
        playlist / visualizer. Add audio under <code>public/audio/</code> to play.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        {collections.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c)}
            style={{
              padding: "0.4rem 0.8rem",
              borderRadius: 6,
              border: "1px solid #2a2438",
              background: c.id === active.id ? "#2a2438" : "transparent",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* key forces a fresh PlayerProvider when the collection changes */}
      <PlayerProvider key={active.id} tracks={active.tracks}>
        <WinampPlayer wordmarkText={active.label} />
        <ClassicSkinDemo />
      </PlayerProvider>
    </div>
  );
}
