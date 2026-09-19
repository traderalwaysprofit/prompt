import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateRetroInfographicSvg } from "../src/visual/generator.ts";
import {
  buildPoster,
  loadPayload,
  parseArgs,
  renderSvgToPng,
} from "../scripts/renderVisual.ts";

const tempDirs: string[] = [];

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

async function makeTempDir(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "samson-visual-test-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("visual CLI options", () => {
  it("uses deterministic defaults", () => {
    expect(parseArgs([])).toEqual({
      outputDir: "dist-visuals",
      name: "forex-rule-card",
    });
  });

  it("parses supported flags and ignores flags without a value", () => {
    expect(parseArgs([
      "--input", "payload.json",
      "--outdir", "generated",
      "--name", "risk-card_v2",
      "--unused",
    ])).toEqual({
      input: "payload.json",
      outputDir: "generated",
      name: "risk-card_v2",
    });
  });

  it("rejects unsafe output names", () => {
    expect(() => parseArgs(["--name", "../escape"])).toThrow(/Output name/);
    expect(() => parseArgs(["--name", "x".repeat(81)])).toThrow(/Output name/);
  });
});

describe("visual payload loading", () => {
  it("returns the built-in payload when no input file is supplied", async () => {
    const payload = await loadPayload();
    expect(payload.systemStatus).toBe("OPTIMIZED");
    expect(payload.items).toHaveLength(3);
    expect(payload.footerAction).toBe("DEPLOY DISCIPLINE_");
  });

  it("loads and validates a JSON payload from disk", async () => {
    const dir = await makeTempDir();
    const input = path.join(dir, "payload.json");
    await fs.writeFile(input, JSON.stringify({
      topicTitle: "TEST POSTER",
      systemStatus: "READY",
      items: [{
        tag: "CHECK",
        tagColor: "#00FF66",
        lines: ["One", "Two"],
      }],
      footerAction: "SHIP_",
    }));

    const payload = await loadPayload(input);
    expect(payload.topicTitle).toBe("TEST POSTER");
    expect(payload.items[0]?.tag).toBe("CHECK");
  });

  it("rejects invalid payloads", async () => {
    const dir = await makeTempDir();
    const input = path.join(dir, "invalid.json");
    await fs.writeFile(input, JSON.stringify({ items: "not-an-array" }));
    await expect(loadPayload(input)).rejects.toThrow();
  });
});

describe("headless visual renderer", () => {
  it("renders a valid 1080x1920 PNG from the deterministic SVG", () => {
    const svg = generateRetroInfographicSvg({
      topicTitle: "RISK MANAGEMENT XAUUSD",
      items: [
        {
          tag: "RISK",
          tagColor: "#FF0055",
          lines: ["Risk 1%", "RR minimum 1:2"],
        },
      ],
    });

    const png = renderSvgToPng(svg);
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(readUint32Be(png, 16)).toBe(1080);
    expect(readUint32Be(png, 20)).toBe(1920);
    expect(png.byteLength).toBeGreaterThan(10_000);
  });

  it("writes SVG and PNG artifacts through the production build path", async () => {
    const dir = await makeTempDir();
    const result = await buildPoster({
      outputDir: dir,
      name: "coverage-poster",
    });

    expect(result.svgPath).toBe(path.join(dir, "coverage-poster.svg"));
    expect(result.pngPath).toBe(path.join(dir, "coverage-poster.png"));

    const [svg, png] = await Promise.all([
      fs.readFile(result.svgPath, "utf8"),
      fs.readFile(result.pngPath),
    ]);
    expect(svg).toContain("<svg");
    expect(svg).toContain("RULE EKSEKUSI TRADING");
    expect(Array.from(png.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  });
});
