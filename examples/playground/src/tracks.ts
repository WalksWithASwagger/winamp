import type { PlayerTrack } from "@walkswithaswagger/winamp";

// Demo seed data for the three KK Suno collections.
//
// Playback needs the actual audio + cover art. Drop files into:
//   examples/playground/public/audio/<file>.mp3
//   examples/playground/public/art/<file>.jpg
// and point audioUrl / coverImage at "/audio/..." and "/art/...".
//
// IMPORTANT: the visualizer + spectrum read the Web Audio analyser, which
// requires same-origin (or CORS-enabled) audio. Local files under public/ are
// same-origin, so they always work. A track WITHOUT audioUrl renders in the
// playlist but is dimmed/unplayable — fine as a placeholder until files land.

// Ethos Labs — Suno playlist
const ethosLabs: PlayerTrack[] = [
  {
    id: "ethos-1",
    number: 1,
    title: "Track One", // TODO: real title
    person: "Ethos Labs",
    bpm: 120,
    // audioUrl: "/audio/ethos-1.mp3",
    // coverImage: "/art/ethos-1.jpg",
    art: { palette: ["#6dcad0"] },
  },
  {
    id: "ethos-2",
    number: 2,
    title: "Track Two",
    person: "Ethos Labs",
    bpm: 100,
    art: { palette: ["#6dcad0"] },
  },
];

// Both Hands Full — Suno playlist
const bothHandsFull: PlayerTrack[] = [
  {
    id: "bhf-1",
    number: 1,
    title: "Track One",
    person: "Both Hands Full",
    bpm: 96,
    art: { palette: ["#f47a52"] },
  },
  {
    id: "bhf-2",
    number: 2,
    title: "Track Two",
    person: "Both Hands Full",
    bpm: 110,
    art: { palette: ["#f47a52"] },
  },
];

// AI Blues — album in progress
const aiBlues: PlayerTrack[] = [
  {
    id: "blues-1",
    number: 1,
    title: "Track One",
    person: "AI Blues",
    bpm: 72,
    art: { palette: ["#fcd117"] },
  },
];

export const collections = [
  { id: "ethos-labs", label: "Ethos Labs", tracks: ethosLabs },
  { id: "both-hands-full", label: "Both Hands Full", tracks: bothHandsFull },
  { id: "ai-blues", label: "AI Blues", tracks: aiBlues },
];

export type Collection = (typeof collections)[number];
