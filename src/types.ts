// The minimal track shape the player needs. Kept deliberately small so the
// deck stays portable: any app can feed it tracks of this shape (the showcase's
// richer `ResolvedTrack` satisfies it structurally). Nothing here ties the
// player to this album's data model.
export interface PlayerTrack {
  id: string;
  number: number;
  title: string;
  person: string;
  bpm: number;
  audioUrl?: string;
  coverImage?: string;
  art: { palette: string[] };
}

/** Fired when a track starts, so a host app can react (e.g. drive an ambient
 *  scene) without the player importing anything app-specific. */
export type NowPlaying = { bpm: number; accent: string };
