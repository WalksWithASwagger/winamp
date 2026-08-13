"use client";

import type { PlayerTrack } from "../types";

export function PlaylistPanel({
  id,
  allTracks,
  currentId,
  playing,
  playTrack,
}: {
  id: string;
  allTracks: PlayerTrack[];
  currentId: string | null;
  playing: boolean;
  playTrack: (id: string) => void;
}) {
  const playableCount = allTracks.filter((track) => track.audioUrl).length;

  return (
    <div id={id} className="deck-list" role="region" aria-label="Playlist">
      <p className="deck-list-head">
        {playableCount}/{allTracks.length} recorded
      </p>
      <ol className="deck-list-rows">
        {allTracks.map((track) => {
          const isCurrent = track.id === currentId;
          const canPlay = Boolean(track.audioUrl);
          return (
            <li key={track.id}>
              <button
                type="button"
                className={`deck-row${isCurrent ? " cur" : ""}${canPlay ? "" : " off"}`}
                onClick={() => canPlay && playTrack(track.id)}
                disabled={!canPlay}
                aria-current={isCurrent || undefined}
                aria-label={`${String(track.number).padStart(2, "0")}. ${track.title} by ${track.person}${isCurrent ? ", current track" : ""}${!canPlay ? ", unavailable" : ""}`}
              >
                {track.coverImage ? (
                  <img className="deck-row-cover" src={track.coverImage} alt="" />
                ) : (
                  <span
                    className="deck-row-cover deck-row-cover-empty"
                    aria-hidden="true"
                  />
                )}
                <span className="deck-row-num">
                  {String(track.number).padStart(2, "0")}
                </span>
                <span className="deck-row-title">{track.title}</span>
                <span className="deck-row-person">{track.person}</span>
                <span className="deck-row-tag">
                  {isCurrent && playing ? (
                    <span className="deck-eq" aria-hidden="true">
                      <i /><i /><i />
                    </span>
                  ) : canPlay ? (
                    "▸"
                  ) : (
                    "·"
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
