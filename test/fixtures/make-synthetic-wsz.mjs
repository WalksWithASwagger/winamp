import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const output = fileURLToPath(new URL("./synthetic.wsz", import.meta.url));

function bitmap(width, height, seed) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const data = Buffer.alloc(54 + rowSize * height);
  data.write("BM", 0, "ascii");
  data.writeUInt32LE(data.length, 2);
  data.writeUInt32LE(54, 10);
  data.writeUInt32LE(40, 14);
  data.writeInt32LE(width, 18);
  data.writeInt32LE(height, 22);
  data.writeUInt16LE(1, 26);
  data.writeUInt16LE(24, 28);
  data.writeUInt32LE(rowSize * height, 34);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const edge = x < 2 || y < 2 || x >= width - 2 || y >= height - 2;
      const r = edge ? 240 : (seed * 31 + x * 3 + y * 5) % 96;
      const g = edge ? 240 : (seed * 17 + x * 5 + y * 2) % 96;
      const b = edge ? 240 : (seed * 7 + x * 2 + y * 3) % 96;
      const offset = 54 + (height - 1 - y) * rowSize + x * 3;
      data[offset] = b;
      data[offset + 1] = g;
      data[offset + 2] = r;
    }
  }
  return data;
}

const bitmaps = {
  MAIN: [275, 116],
  CBUTTONS: [136, 36],
  TITLEBAR: [302, 56],
  MONOSTER: [56, 24],
  PLAYPAUS: [48, 9],
  NUMBERS: [90, 13],
  POSBAR: [307, 10],
  VOLUME: [68, 433],
  BALANCE: [47, 433],
  SHUFREP: [75, 85],
  EQMAIN: [275, 188],
  PLEDIT: [276, 110],
  TEXT: [155, 18],
};

const temp = mkdtempSync(join(tmpdir(), "winamp-synthetic-"));
try {
  const files = [];
  for (const [name, [width, height]] of Object.entries(bitmaps)) {
    const file = join(temp, `${name}.bmp`);
    writeFileSync(file, bitmap(width, height, name.length));
    files.push(file);
  }

  const viscolor = Array.from({ length: 24 }, (_, i) =>
    `${(i * 11) % 256},${(i * 17) % 256},${(i * 23) % 256}`,
  ).join("\n");
  writeFileSync(join(temp, "viscolor.txt"), `${viscolor}\n`);
  writeFileSync(
    join(temp, "pledit.txt"),
    "[Text]\nNormal=#A8FF60\nCurrent=#FFFFFF\nNormalBG=#101820\nSelectedBG=#245030\n",
  );

  execFileSync("zip", ["-q", "-j", output, ...files, join(temp, "viscolor.txt"), join(temp, "pledit.txt")]);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
