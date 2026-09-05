export type TransmissionRelease = {
  audioUrl: string;
  duration: number;
  credits: string;
  chapters: Array<{ at: number; title: string; image: string; alt: string }>;
  note: { audioUrl: string; duration: number; transcript: string; credits: string };
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function asset(value: unknown, folder: "audio" | "art"): value is string {
  const extensions = folder === "audio" ? "mp3|wav" : "jpg|jpeg|png|webp";
  return text(value) && new RegExp(`^/${folder}/[a-zA-Z0-9_/-]+\\.(${extensions})$`).test(value);
}

export function readRelease(value: unknown): TransmissionRelease | null {
  if (!record(value)) throw new Error("Invalid transmission manifest");
  if (value.release === null) return null;
  const r = value.release;
  if (!record(r) || !asset(r.audioUrl, "audio") || !text(r.credits) ||
      typeof r.duration !== "number" || !Number.isFinite(r.duration) || r.duration <= 0 || r.duration > 300 ||
      !Array.isArray(r.chapters) || r.chapters.length !== 3 || !record(r.note) ||
      !asset(r.note.audioUrl, "audio") || r.note.audioUrl === r.audioUrl || !text(r.note.transcript) || !text(r.note.credits) ||
      typeof r.note.duration !== "number" || !Number.isFinite(r.note.duration) || r.note.duration < 15 || r.note.duration > 30) {
    throw new Error("Incomplete transmission release");
  }
  let previous = -1;
  for (const [index, chapter] of r.chapters.entries()) {
    if (!record(chapter) || typeof chapter.at !== "number" || !Number.isFinite(chapter.at) ||
        chapter.at <= previous || chapter.at >= r.duration || (index === 0 && chapter.at !== 0) ||
        !text(chapter.title) || !asset(chapter.image, "art") || !text(chapter.alt)) {
      throw new Error("Invalid transmission chapters");
    }
    previous = chapter.at;
  }
  return r as TransmissionRelease;
}

export function momentFromSearch(search: string, duration: number): number {
  const value = Number(new URLSearchParams(search).get("t"));
  return Number.isFinite(value) ? Math.max(0, Math.min(value, duration)) : 0;
}

export function chapterAt(release: TransmissionRelease, time: number): number {
  for (let i = release.chapters.length - 1; i > 0; i--) {
    if (time >= release.chapters[i].at) return i;
  }
  return 0;
}

export function clock(time: number): string {
  const seconds = Math.max(0, Math.floor(time));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
