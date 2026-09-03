import { describe, expect, it } from "vitest";
import { generateRetroInfographicSvg } from "../src/visual/generator.ts";
import { renderSvgToPng } from "../scripts/renderVisual.ts";

function readUint32Be(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

describe("headless PNG renderer", () => {
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
});
