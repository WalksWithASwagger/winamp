import type { PlayerTrack } from "@walkswithaswagger/winamp";

// Station collections for ghost.radio.fm. Gorgeous Ghost is local audio;
// the rest stream from Suno's public CDN (CORS `*`, so the visualizer + EQ
// work). The Suno collections + STATIONS below are GENERATED — edit the
// playlists on Suno and re-run `node examples/playground/scripts/sync-suno.mjs`,
// don't hand-edit.

export const gorgeousGhost: PlayerTrack[] = [
  { id: "gg-now", number: 1, title: "Gorgeous Ghost (NOW)", person: "Kris Krüg", bpm: 100, audioUrl: "/audio/gorgeous-ghost-now.mp3", coverImage: "/art/gorgeous-ghost-now.jpg", art: { palette: ["#b49cff"] } },
  { id: "dark-door", number: 2, title: "The Dark's Just a Door (Remastered)", person: "Kris Krüg", bpm: 92, audioUrl: "/audio/the-darks-just-a-door.mp3", coverImage: "/art/the-darks-just-a-door.jpg", art: { palette: ["#e6a64d"] } },
  { id: "gg", number: 3, title: "Gorgeous Ghost", person: "Kris Krüg", bpm: 100, audioUrl: "/audio/gorgeous-ghost.mp3", coverImage: "/art/gorgeous-ghost.jpg", art: { palette: ["#d2a6e8"] } },
];

// Too Weird to Die — Kris Krüg (Suno)
export const tooWeirdToDie: PlayerTrack[] = [
  {
    id: "82eab129-1fd4-4b79-a570-9032ac036789",
    number: 1,
    title: "Don't Need Your Permission",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/82eab129-1fd4-4b79-a570-9032ac036789.mp3",
    coverImage: "https://cdn2.suno.ai/image_82eab129-1fd4-4b79-a570-9032ac036789.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "da3849b8-974c-485f-84ef-149772b7d8ff",
    number: 2,
    title: "Meatsuit Moshpit",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/da3849b8-974c-485f-84ef-149772b7d8ff.mp3",
    coverImage: "https://cdn2.suno.ai/image_da3849b8-974c-485f-84ef-149772b7d8ff.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "2986101c-713d-4d90-a3c5-6c47c626a23a",
    number: 3,
    title: "Both Hands Full",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/2986101c-713d-4d90-a3c5-6c47c626a23a.mp3",
    coverImage: "https://cdn2.suno.ai/image_2986101c-713d-4d90-a3c5-6c47c626a23a.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "0d6e1943-6e3d-4d81-a0ab-c3b71f27600f",
    number: 4,
    title: "I Don't Care",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/0d6e1943-6e3d-4d81-a0ab-c3b71f27600f.mp3",
    coverImage: "https://cdn2.suno.ai/dc16c4f9-54b3-4fab-b505-4b4f9acc56c1.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "f26e4e96-e3f8-4c78-8d54-90184cc805e6",
    number: 5,
    title: "BONUS: Too Weird to Die",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/f26e4e96-e3f8-4c78-8d54-90184cc805e6.mp3",
    coverImage: "https://cdn2.suno.ai/c51b43da-6a0f-4351-a01a-e4e5a3b607e4.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "968b9cc0-7e00-4478-9792-61b0dd66699c",
    number: 6,
    title: "Train Yer Own Ghost",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/968b9cc0-7e00-4478-9792-61b0dd66699c.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_fc191507-6890-4014-90e6-9b71ff70cafb_video_upload_fc191507-6890-4014-90e6-9b71ff70cafb_cover_snapshot_0s_1775661421_image.jpeg",
    art: { palette: ["#e0734d"] },
  },
  {
    id: "e95e2c10-5213-4052-a066-848926a7f5fa",
    number: 7,
    title: "Both Hands Full - Too Weird to Die - Kris Krüg (R3ALMS Remix)",
    person: "Kris Krüg",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/e95e2c10-5213-4052-a066-848926a7f5fa.mp3",
    coverImage: "https://cdn2.suno.ai/696d728a-f25e-4672-9675-9b0b6c93c3f7.jpeg",
    art: { palette: ["#e0734d"] },
  },
];

// Ethọ́s Lab Block Party 2026 (Suno)
export const ethosBlockParty: PlayerTrack[] = [
  {
    id: "40fb3c99-efc6-4846-a889-60358cf3ba46",
    number: 1,
    title: "Sound Space",
    person: "Chibueze",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/40fb3c99-efc6-4846-a889-60358cf3ba46.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_9e644cde-3260-4f49-9b9d-becbc0fac53b_video_upload_9e644cde-3260-4f49-9b9d-becbc0fac53b_cover_snapshot_0s_1781562871_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "ec950fdb-2d88-410b-95d7-30100ffaef2b",
    number: 2,
    title: "Take Notice",
    person: "Chris B.",
    bpm: 110,
    audioUrl: "https://cdn1.suno.ai/ec950fdb-2d88-410b-95d7-30100ffaef2b.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_f01e1613-6379-4c1b-8d94-c6ff39294ec5_video_upload_f01e1613-6379-4c1b-8d94-c6ff39294ec5_cover_snapshot_0s_1781543175_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "7eb85e1f-497e-4df2-90b3-1ead4967d7fb",
    number: 3,
    title: "Found My Way",
    person: "Caleb",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/7eb85e1f-497e-4df2-90b3-1ead4967d7fb.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_46c737f0-5c7e-4076-94e5-f9e147352832_video_upload_46c737f0-5c7e-4076-94e5-f9e147352832_cover_snapshot_0s_1781561787_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "ac0ba37a-d0d3-4845-ab21-4aba3865a3c0",
    number: 4,
    title: "Sirop et Soleil",
    person: "Aster",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/ac0ba37a-d0d3-4845-ab21-4aba3865a3c0.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_bcee627c-a8a0-4f3e-aeb4-190eecaed4c9_video_upload_bcee627c-a8a0-4f3e-aeb4-190eecaed4c9_cover_snapshot_0s_1781543990_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "1e79907b-204d-41ae-a7c2-eded2bb1f246",
    number: 5,
    title: "My Love",
    person: "Ollie",
    bpm: 96,
    audioUrl: "https://cdn1.suno.ai/1e79907b-204d-41ae-a7c2-eded2bb1f246.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_341b2561-2080-4b1b-a0f5-8ffa0bbf1a24_video_upload_341b2561-2080-4b1b-a0f5-8ffa0bbf1a24_cover_snapshot_0s_1781542678_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "c03dcf51-e739-4a86-b625-12f30b0e0083",
    number: 6,
    title: "Seeds of Everything",
    person: "Dale",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/c03dcf51-e739-4a86-b625-12f30b0e0083.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_44f85be1-2d5b-4132-a7e0-8fb0c2305ec9_video_upload_44f85be1-2d5b-4132-a7e0-8fb0c2305ec9_cover_snapshot_0s_1781547549_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "7c571235-1c14-4cc5-bc3c-37ad2b4515c2",
    number: 7,
    title: "Until They Do",
    person: "Bobby",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/7c571235-1c14-4cc5-bc3c-37ad2b4515c2.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_cce2bb56-8f40-4981-9c4b-a4fe4c66def7_video_upload_cce2bb56-8f40-4981-9c4b-a4fe4c66def7_cover_snapshot_0s_1781545386_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "fd9714c0-2935-4fa9-bc6c-160ef837941b",
    number: 8,
    title: "Earlier Than Me",
    person: "Maurice",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/fd9714c0-2935-4fa9-bc6c-160ef837941b.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_49180d21-0176-46ee-af7c-35947f93184e_video_upload_49180d21-0176-46ee-af7c-35947f93184e_cover_snapshot_0s_1781548036_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "e94f8f3e-50a1-45d4-89ae-c7bbf42c0f31",
    number: 9,
    title: "Build It Back",
    person: "Sandy",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/e94f8f3e-50a1-45d4-89ae-c7bbf42c0f31.mp3",
    coverImage: "https://cdn2.suno.ai/2c97fafd-1f84-4d5a-b455-9415a2b0e1d9.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "8e19eb21-8578-4c85-84ee-600883d117f1",
    number: 10,
    title: "Beautiful People",
    person: "Anthonia",
    bpm: 100,
    audioUrl: "https://cdn1.suno.ai/8e19eb21-8578-4c85-84ee-600883d117f1.mp3",
    coverImage: "https://cdn2.suno.ai/video_gen_c7e08d50-8e95-44be-b47a-6ae05e50d74d_video_upload_c7e08d50-8e95-44be-b47a-6ae05e50d74d_cover_snapshot_0s_1781552212_image.jpeg",
    art: { palette: ["#f2a13d"] },
  },
  {
    id: "d79b7773-1f02-43d7-9ab2-04eacae40e87",
    number: 11,
    title: "Meta Angel in da Parking Lot",
    person: "Kris",
    bpm: 84,
    audioUrl: "https://cdn1.suno.ai/d79b7773-1f02-43d7-9ab2-04eacae40e87.mp3",
    coverImage: "https://cdn2.suno.ai/e3bad89d-02fe-4d1b-a47c-dedf15866704.jpeg",
    art: { palette: ["#f2a13d"] },
  },
];

export type Station = {
  id: string;
  freq: string;
  name: string;
  desc: string;
  collection: PlayerTrack[];
  href?: string;
};

// Dial presets — tuning one swaps what the floating deck plays.
export const STATIONS: Station[] = [
  { id: "too-weird", freq: "88.1", name: "BOTH HANDS FULL", desc: "Too Weird to Die — the record.", collection: tooWeirdToDie, href: "https://bothhandsfull.com" },
  { id: "ethos", freq: "92.3", name: "ETHOS BLOCK PARTY", desc: "Ethọ́s Lab Block Party 2026.", collection: ethosBlockParty, href: "https://ethosblockparty.com" },
  { id: "gorgeous-ghost", freq: "100.7", name: "GORGEOUS GHOST", desc: "The album — live on the deck.", collection: gorgeousGhost },
];
