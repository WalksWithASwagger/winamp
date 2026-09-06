import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TransmissionProof } from "./Transmission";
import { readProgramme } from "./score";

const root = createRoot(document.getElementById("root")!);
fetch("/transmission-proof.json")
  .then((response) => {
    if (!response.ok) throw new Error("Proof unavailable");
    return response.json();
  })
  .then((proof) => {
    if (proof.status !== "unapproved") throw new Error("Invalid proof");
    root.render(<StrictMode><TransmissionProof programme={readProgramme(proof.programme)} /></StrictMode>);
  })
  .catch(() => root.render(<main className="transmission"><h1>Private proof unavailable</h1>
    <p>Prepare the proof again, then restart its local preview.</p></main>));
