import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Transmission } from "./Transmission";
import { readRelease } from "./score";

const root = createRoot(document.getElementById("root")!);
fetch("/transmission-001.json")
  .then((response) => {
    if (!response.ok) throw new Error("Transmission unavailable");
    return response.json();
  })
  .then((manifest) => root.render(<StrictMode><Transmission release={readRelease(manifest)} /></StrictMode>))
  .catch(() => root.render(<main className="transmission"><h1>Transmission 001</h1>
    <p>The signal couldn’t be found. Please reload to try again.</p><a href="/">Back to Ghost Radio</a></main>));
