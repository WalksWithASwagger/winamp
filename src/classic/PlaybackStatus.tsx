"use client";

import type { PlaybackError, PlaybackStatus } from "../types";

export function ClassicPlaybackStatus({
  status,
  error,
  onRetry,
}: {
  status: PlaybackStatus;
  error: PlaybackError | null;
  onRetry: () => void;
}) {
  if (status !== "loading" && !error) return null;
  const failed = Boolean(error);
  return (
    <div
      role={failed ? "alert" : "status"}
      aria-live={failed ? "assertive" : "polite"}
      style={{
        position: "absolute",
        left: 15,
        top: 16,
        zIndex: 5,
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 4px",
        color: failed ? "#ff9d9d" : "#fcd117",
        background: "rgba(0, 0, 0, 0.9)",
        border: `1px solid ${failed ? "#8b4545" : "#756314"}`,
        font: "9px ui-monospace, monospace",
      }}
    >
      <span>{failed ? "Unable to play this track." : "Loading track…"}</span>
      {failed && (
        <button type="button" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}
