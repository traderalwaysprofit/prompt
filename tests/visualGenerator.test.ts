import { describe, expect, it } from "vitest";
import {
  VISUAL_OUTPUT,
  VisualCardDataSchema,
  generateRetroInfographicSvg,
  type VisualCardData,
} from "../src/visual/generator.ts";

const payload: VisualCardData = {
  systemStatus: "OPTIMIZED",
  topicTitle: "RULE EKSEKUSI TRADING & INFRA",
  items: [
    {
      tag: "RISK MANAGEMENT",
      tagColor: "#FF0055",
      lines: ["Max risk 1%", "SL wajib", "RR minimum 1:2"],
    },
    {
      tag: "EXECUTION PIPELINE",
      tagColor: "#00FF66",
      lines: ["Check calendar", "Validate spread"],
    },
  ],
  footerAction: "DEPLOY DISCIPLINE_",
};

describe("retro visual generator", () => {
  it("enforces the 1080x1920 9:16 output contract and strict credit", () => {
    const svg = generateRetroInfographicSvg(payload);
    expect(svg).toContain('viewBox="0 0 1080 1920"');
    expect(svg).toContain('width="1080" height="1920"');
    expect(svg).toContain(">by belajarforexmalang</text>");
    expect(VISUAL_OUTPUT).toMatchObject({ width: 1080, height: 1920, aspectRatio: "9:16" });
  });

  it("has no logo/image element or remote font dependency", () => {
    const svg = generateRetroInfographicSvg(payload);
    expect(svg).not.toContain("<image");
    expect(svg).not.toContain("fonts.googleapis.com");
    expect(svg).not.toContain("@import");
  });

  it("escapes dynamic text before embedding it in SVG", () => {
    const svg = generateRetroInfographicSvg({
      ...payload,
      topicTitle: '<script>alert("x")</script> & safe',
      items: [{
        tag: 'RISK & <TEST>',
        tagColor: "#00FF66",
        lines: ['5 > 3 & "quoted"'],
      }],
    });

    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).toContain("RISK &amp; &lt;TEST&gt;");
    expect(svg).toContain("5 &gt; 3 &amp; &quot;quoted&quot;");
  });

  it("rejects color attribute injection and excess blocks", () => {
    expect(() => VisualCardDataSchema.parse({
      ...payload,
      items: [{
        tag: "INJECT",
        tagColor: '#00FF66\" onload=\"alert(1)',
        lines: ["unsafe"],
      }],
    })).toThrow();

    expect(() => VisualCardDataSchema.parse({
      ...payload,
      items: [payload.items[0], payload.items[0], payload.items[0], payload.items[0]],
    })).toThrow();
  });

  it("wraps oversized body copy into a bounded four-line block", () => {
    const svg = generateRetroInfographicSvg({
      ...payload,
      items: [{
        tag: "LONG COPY",
        tagColor: "#FFFF00",
        lines: [
          "This intentionally long sentence must be wrapped into bounded display lines so the generated poster never depends on manual text-box resizing after rendering",
          "second long sentence also needs deterministic clipping when the visual budget is exhausted",
        ],
      }],
    });

    const bulletMatches = svg.match(/class="pixel-body">• /g) ?? [];
    expect(bulletMatches.length).toBeLessThanOrEqual(4);
    expect(svg).toContain("…");
  });
});
