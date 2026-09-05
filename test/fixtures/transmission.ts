import type { TransmissionRelease } from "../../examples/playground/src/transmission/score";

// Test-owned synthetic media, never a substitute for approved release content.
export const transmissionFixture: TransmissionRelease = {
  audioUrl: "/audio/test-programme.wav",
  duration: 30,
  credits: "TEST FIXTURE — synthetic programme",
  chapters: [
    { at: 0, title: "Gorgeous Ghost (NOW)", image: "/art/gorgeous-ghost-now.jpg", alt: "Silver figure inside a golden ring." },
    { at: 10, title: "The Dark’s Just a Door", image: "/art/the-darks-just-a-door.jpg", alt: "The Dark’s Just a Door cover art." },
    { at: 20, title: "Gorgeous Ghost", image: "/art/gorgeous-ghost.jpg", alt: "Gorgeous Ghost cover art." },
  ],
  note: {
    audioUrl: "/audio/test-note.wav", duration: 15,
    transcript: "TEST ONLY. A synthetic tone stands in for the approved artist’s recording. No creator speech is present.",
    credits: "TEST FIXTURE — synthetic note",
  },
};
