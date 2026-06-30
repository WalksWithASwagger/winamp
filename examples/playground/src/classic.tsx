import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@walkswithaswagger/winamp/styles.css";
import "./classic.css";
import { ClassicSkinDemo } from "./ClassicSkinDemo";

// Standalone booth page (served at /classic). The hub stays one-screen and
// modern; this is where the authentic .wsz engine lives.
function ClassicPage() {
  return (
    <main className="classic-page">
      <header className="cp-top">
        <span>ghost.radio.fm / classic booth</span>
        <a className="cp-back" href="/">
          ← back to ghost radio
        </a>
      </header>

      <h1 className="cp-title">
        CLASSIC<b>·</b>BOOTH
      </h1>
      <p className="cp-intro">
        Real Winamp 2 <code>.wsz</code> skins — pixel-faithful main, EQ, and
        playlist windows on the same open-source engine that drives the hub.
        Switch skins live, drag the windows around.{" "}
        <a href="https://github.com/WalksWithASwagger/winamp">source ↗</a>
      </p>

      <div className="cp-booth">
        <ClassicSkinDemo />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClassicPage />
  </StrictMode>,
);
