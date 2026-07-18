import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assertPackageIntegrity,
  missingPackageFiles,
  requiredPackageFiles,
} from "../scripts/check-package.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const completePackage = [
  "dist/index.cjs",
  "dist/index.cjs.map",
  "dist/index.d.cts",
  "dist/index.d.ts",
  "dist/index.js",
  "dist/index.js.map",
  "dist/skins.css",
  "dist/styles.css",
];

describe("package integrity", () => {
  it("covers the complete current package surface", () => {
    expect(requiredPackageFiles(packageJson)).toEqual(completePackage);
    expect(missingPackageFiles(packageJson, completePackage)).toEqual([]);
    expect(() => assertPackageIntegrity(packageJson, completePackage)).not.toThrow();
  });

  it("fails when a declared export is missing", () => {
    const withoutSkins = completePackage.filter((file) => file !== "dist/skins.css");

    expect(missingPackageFiles(packageJson, withoutSkins)).toEqual(["dist/skins.css"]);
    expect(() => assertPackageIntegrity(packageJson, withoutSkins)).toThrow(
      "Package tarball is missing required files:\ndist/skins.css",
    );
  });

  it("fails when the CommonJS declaration is missing", () => {
    const withoutCommonJsTypes = completePackage.filter((file) => file !== "dist/index.d.cts");

    expect(missingPackageFiles(packageJson, withoutCommonJsTypes)).toEqual(["dist/index.d.cts"]);
    expect(() => assertPackageIntegrity(packageJson, withoutCommonJsTypes)).toThrow(
      "Package tarball is missing required files:\ndist/index.d.cts",
    );
  });
});
