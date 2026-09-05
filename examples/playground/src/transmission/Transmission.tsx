import { useEffect, useRef, useState } from "react";
import { PlayerProvider, usePlayer, usePrefersReducedMotion, type PlayerTrack } from "@walkswithaswagger/winamp";
import { chapterAt, clock, momentFromSearch, type TransmissionRelease } from "./score";
import "./transmission.css";

const poster = "/art/gorgeous-ghost-now.jpg";
const posterAlt = "A silver figure suspended inside a golden ring above iridescent spheres.";
const programmeId = "transmission-001";
const noteId = "transmission-001-note";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="transmission">
      <header className="tx-masthead">
        <a href="/" aria-label="Ghost Radio home">GHOST<span>·</span>RADIO</a>
        <span>100.7 / GORGEOUS GHOST</span>
      </header>
      <div className="tx-heading">
        <div><p className="tx-kicker">A listening edition</p><h1>Transmission <span>001</span></h1></div>
        <p className="tx-tagline">Stay a while. <br />There’s someone behind the signal.</p>
      </div>
      {children}
      <footer className="tx-footer"><a href="/">Back to the dial ↗</a><span>GHOST RADIO / KRIS KRÜG</span></footer>
    </main>
  );
}

export function Transmission({ release }: { release: TransmissionRelease | null }) {
  const [endedId, setEndedId] = useState<string | null>(null);
  if (!release) return (
    <Shell>
      <section className="tx-unavailable" aria-labelledby="tx-pending">
        <img src={poster} alt={posterAlt} />
        <div><p className="tx-kicker">Still between stations</p><h2 id="tx-pending">A signal is taking shape.</h2>
          <p>Transmission 001 is being prepared. Come back for the music, and the person behind it.</p>
          <a className="tx-primary" href="/">Listen to Ghost Radio ↗</a>
        </div>
      </section>
    </Shell>
  );
  const tracks: PlayerTrack[] = [
    { id: programmeId, number: 1, title: "Transmission 001 — Gorgeous Ghost", person: release.credits, bpm: 0, audioUrl: release.audioUrl, coverImage: poster, art: { palette: ["#efb654"] } },
    { id: noteId, number: 2, title: "Transmission 001 — Artist’s note", person: release.note.credits, bpm: 0, audioUrl: release.note.audioUrl, coverImage: poster, art: { palette: ["#efb654"] } },
  ];
  return <Shell><PlayerProvider tracks={tracks} transportMode="single" onTrackEnded={setEndedId}>
    <ListeningRoom release={release} endedId={endedId} clearEnd={() => setEndedId(null)} />
  </PlayerProvider></Shell>;
}

function ListeningRoom({ release, endedId, clearEnd }: {
  release: TransmissionRelease; endedId: string | null; clearEnd: () => void;
}) {
  const player = usePlayer();
  const { cue, seek } = player;
  const initial = useRef(false);
  const returnButton = useRef<HTMLButtonElement>(null);
  const noteButton = useRef<HTMLButtonElement>(null);
  const previousNote = useRef(false);
  const bookmark = useRef({ time: 0, playing: false });
  const [inNote, setInNote] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const [staticMode, setStaticMode] = useState(false);
  const [shareState, setShareState] = useState<"idle" | "copied" | "manual">("idle");
  const [shareUrl, setShareUrl] = useState("");
  const time = inNote ? bookmark.current.time : player.time;
  const chapterIndex = chapterAt(release, time);
  const chapter = release.chapters[chapterIndex];
  const activeId = inNote ? noteId : programmeId;
  const duration = inNote ? release.note.duration : release.duration;
  const ended = endedId === activeId && !player.playing && player.time >= duration - 0.1;

  useEffect(() => {
    if (initial.current) return;
    initial.current = true;
    cue(programmeId);
    seek(momentFromSearch(window.location.search, release.duration));
  }, [cue, seek, release.duration]);

  useEffect(() => {
    if (inNote) returnButton.current?.focus();
    else if (previousNote.current) noteButton.current?.focus();
    previousNote.current = inNote;
  }, [inNote]);

  const playPause = () => {
    if (player.playing) { player.toggle(); return; }
    if (ended || player.time >= duration) seek(0);
    clearEnd();
    player.playTrack(activeId);
  };
  const enterNote = () => {
    bookmark.current = { time: player.time, playing: player.playing };
    clearEnd();
    setInNote(true);
    setShareState("idle");
    player.playTrack(noteId);
  };
  const returnToProgramme = () => {
    cue(programmeId);
    seek(bookmark.current.time);
    if (bookmark.current.playing) player.playTrack(programmeId);
    setInNote(false);
    clearEnd();
    setShareState("idle");
  };
  const share = async () => {
    const url = `https://ghost.radio.fm/transmission-001?t=${Math.floor(time)}`;
    setShareUrl(url);
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch { setShareState("manual"); }
  };
  const status = player.playbackStatus === "error" ? "The signal couldn’t load. Your place is saved."
    : player.playbackStatus === "loading" ? "Finding the signal…"
    : ended ? (inNote ? "End of artist’s note." : "End of transmission. Thanks for staying.")
    : player.playing ? (inNote ? "Listening to the artist’s note." : "Transmission playing.")
    : "Ready when you are.";

  return <section className="tx-room" aria-label="Transmission player" data-static={staticMode || reducedMotion}>
    <div className="tx-stage">
      <img key={chapter.image} className="tx-art" src={chapter.image} alt={chapter.alt} />
      <div className="tx-frame" aria-hidden="true"><span>GHOST / 001</span><span>{String(chapterIndex + 1).padStart(2, "0")} — 03</span></div>
      <div className="tx-caption"><span className="tx-kicker">{inNote ? "A voice behind the signal" : `Chapter 0${chapterIndex + 1}`}</span>
        <h2>{inNote ? "The artist’s note" : chapter.title}</h2>
      </div>
    </div>
    <div className="tx-controls">
      <p className="tx-status" role="status">{status}</p>
      <div className="tx-transport">
        <button type="button" className="tx-primary" onClick={playPause} disabled={player.playbackStatus === "error"}>
          {player.playing ? "Pause" : ended || player.time >= duration ? "Replay" : "Play"}
          <span aria-hidden="true">{player.playing ? "Ⅱ" : "↗"}</span>
        </button>
        <div className="tx-position"><span>{clock(player.time)}</span><span> / {clock(duration)}</span></div>
        {player.playbackStatus === "error" && <button type="button" onClick={player.retry}>Retry</button>}
      </div>
      <label className="tx-seek">{inNote ? "Artist’s note position" : "Transmission position"}
        <input type="range" min={0} max={duration} step={0.1} value={Math.min(player.time, duration)}
          aria-valuetext={`${clock(player.time)} of ${clock(duration)}`} onChange={(e) => { clearEnd(); seek(Number(e.target.value)); setShareState("idle"); }} />
      </label>
      <ol className="tx-chapters" aria-label="Programme chapters">
        {release.chapters.map((c, i) => <li key={c.at}>
          <button type="button" aria-current={chapterIndex === i ? "true" : undefined} disabled={inNote}
            onClick={() => { clearEnd(); seek(c.at); setShareState("idle"); }}>
            <span>0{i + 1} / {clock(c.at)}</span>{c.title}
          </button>
        </li>)}
      </ol>
      <aside className="tx-note" aria-label="Artist’s note">
        <p className="tx-kicker">One short detour</p>
        {inNote ? <>
          <p>Your transmission is waiting at {clock(bookmark.current.time)}.</p>
          <button type="button" ref={returnButton} onClick={returnToProgramme}>Return to transmission ↗</button>
        </> : <><p>Hear from the person behind the music. We’ll keep your place.</p>
          <button type="button" ref={noteButton} onClick={enterNote}>Hear the artist ↗</button>
        </>}
        <details><summary>Read the transcript</summary><p className="tx-transcript">{release.note.transcript}</p><p>{release.note.credits}</p></details>
      </aside>
      <div className="tx-utilities">
        <button type="button" onClick={share}>Copy this moment</button>
        <button type="button" aria-pressed={staticMode || reducedMotion} disabled={reducedMotion} onClick={() => setStaticMode(!staticMode)}>Static mode</button>
      </div>
      <div role="status" className="tx-share-status">{shareState === "copied" ? "Moment copied." : ""}</div>
      {shareState === "manual" && <label className="tx-copy">Copy this link
        <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} />
      </label>}
      <p className="tx-credits">{release.credits}</p>
    </div>
  </section>;
}
