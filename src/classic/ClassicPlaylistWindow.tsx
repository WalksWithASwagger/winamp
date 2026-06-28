"use client";

import { type CSSProperties } from "react";
import { usePlayer } from "../PlayerProvider";
import { useSkin } from "./useSkin";
import { SkinProvider, useSkinContext } from "./SkinContext";
import { usePersistedState } from "./usePersistedState";
import type { SpriteName } from "./skinSprites";

const W = 275;
const H = 116;
const TOP_H = 20;
const BOTTOM_H = 38;
const LEFT_W = 12;
const RIGHT_W = 20;
const TITLE_W = 100;
const SHADE_H = 14;

// A skin sprite stretched/tiled to fill a region (frames are too small to size
// from SPRITE_DIMS alone, so width/height are explicit here).
function Tile({
  name,
  left,
  top,
  width,
  height,
  repeat = "repeat",
}: {
  name: SpriteName;
  left: number;
  top: number;
  width: number;
  height: number;
  repeat?: CSSProperties["backgroundRepeat"];
}) {
  const skin = useSkinContext();
  const uri = skin?.sprites[name];
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        height,
        backgroundImage: uri ? `url(${uri})` : undefined,
        backgroundRepeat: repeat,
        imageRendering: "pixelated",
      }}
    />
  );
}

/**
 * Classic Winamp playlist window from a `.wsz` skin, driven by the surrounding
 * {@link PlayerProvider}. Lists `allTracks`, colored from the skin's pledit.txt;
 * clicking a playable row plays it; the current track is highlighted. Render
 * inside a `<PlayerProvider>` with the same `skinUrl` as the main window.
 */
export function ClassicPlaylistWindow({
  skinUrl,
  scale = 1,
  storageKey = "classicPlaylist",
}: {
  skinUrl: string;
  scale?: number;
  storageKey?: string;
}) {
  const { skin, status } = useSkin(skinUrl);
  const { allTracks, currentId, playTrack } = usePlayer();
  const [shade, setShade] = usePersistedState(`${storageKey}:shade`, false);

  const colors = skin?.colors;
  const normal = colors?.playlistNormal ?? "#00ff00";
  const current = colors?.playlistCurrent ?? "#ffffff";
  const bg = colors?.playlistNormalBackground ?? "#000000";
  const selectedBg = colors?.playlistSelectedBackground ?? "#0000c6";

  const titleLeft = Math.round((W - TITLE_W) / 2);
  const height = shade ? SHADE_H : H;

  // Double-click the title bar to toggle window-shade.
  const shadeToggle = (
    <div
      onDoubleClick={() => setShade(!shade)}
      title="Double-click to toggle windowshade"
      style={{ position: "absolute", left: 25, top: 0, width: W - 75, height: SHADE_H, cursor: "pointer" }}
    />
  );

  return (
    <SkinProvider skin={skin}>
      <div data-pl-status={status} data-shade={shade ? "true" : "false"} style={{ width: W * scale, height: height * scale }}>
        <div
          style={{
            position: "relative",
            width: W,
            height,
            transform: scale === 1 ? undefined : `scale(${scale})`,
            transformOrigin: "top left",
            imageRendering: "pixelated",
          }}
        >
          {shade ? (
            <>
              <Tile name="PLAYLIST_SHADE_LEFT" left={0} top={0} width={25} height={SHADE_H} repeat="no-repeat" />
              <Tile name="PLAYLIST_SHADE_CENTER" left={25} top={0} width={W - 75} height={SHADE_H} repeat="repeat-x" />
              <Tile name="PLAYLIST_SHADE_RIGHT" left={W - 50} top={0} width={50} height={SHADE_H} repeat="no-repeat" />
              {shadeToggle}
            </>
          ) : (
          <>
          {/* Frame: top strip, side tiles, bottom corners. */}
          <Tile name="PLAYLIST_TOP_TILE_SELECTED" left={0} top={0} width={W} height={TOP_H} repeat="repeat-x" />
          <Tile name="PLAYLIST_TOP_LEFT_SELECTED" left={0} top={0} width={25} height={TOP_H} repeat="no-repeat" />
          <Tile name="PLAYLIST_TITLE_BAR_SELECTED" left={titleLeft} top={0} width={TITLE_W} height={TOP_H} repeat="no-repeat" />
          <Tile name="PLAYLIST_TOP_RIGHT_CORNER_SELECTED" left={W - 25} top={0} width={25} height={TOP_H} repeat="no-repeat" />
          {shadeToggle}
          <Tile name="PLAYLIST_LEFT_TILE" left={0} top={TOP_H} width={LEFT_W} height={H - TOP_H - BOTTOM_H} repeat="repeat-y" />
          <Tile name="PLAYLIST_RIGHT_TILE" left={W - RIGHT_W} top={TOP_H} width={RIGHT_W} height={H - TOP_H - BOTTOM_H} repeat="repeat-y" />
          <Tile name="PLAYLIST_BOTTOM_LEFT_CORNER" left={0} top={H - BOTTOM_H} width={125} height={BOTTOM_H} repeat="no-repeat" />
          <Tile name="PLAYLIST_BOTTOM_RIGHT_CORNER" left={125} top={H - BOTTOM_H} width={150} height={BOTTOM_H} repeat="no-repeat" />

          {/* Track list. */}
          <div
            style={{
              position: "absolute",
              left: LEFT_W,
              top: TOP_H,
              width: W - LEFT_W - RIGHT_W,
              height: H - TOP_H - BOTTOM_H,
              background: bg,
              overflowY: "auto",
              font: "9px ui-monospace, monospace",
              lineHeight: "10px",
              whiteSpace: "nowrap",
            }}
          >
            {allTracks.map((t) => {
              const isCurrent = t.id === currentId;
              const playable = !!t.audioUrl;
              return (
                <div
                  key={t.id}
                  onClick={() => playable && playTrack(t.id)}
                  title={`${t.title} - ${t.person}`}
                  style={{
                    padding: "0 3px",
                    color: isCurrent ? current : normal,
                    background: isCurrent ? selectedBg : undefined,
                    opacity: playable ? 1 : 0.5,
                    cursor: playable ? "pointer" : "default",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {t.number}. {t.title} - {t.person}
                </div>
              );
            })}
          </div>
          </>
          )}
        </div>
      </div>
    </SkinProvider>
  );
}
