import { z } from "zod";

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const CREDIT = "by belajarforexmalang";

const VisualItemSchema = z.object({
  tag: z.string().min(1).max(48),
  tagColor: z.string().regex(HEX_COLOR, "tagColor must be a six-digit hex color"),
  lines: z.array(z.string().min(1).max(180)).min(1).max(8),
}).strict();

export const VisualCardDataSchema = z.object({
  systemStatus: z.string().min(1).max(40).optional(),
  topicTitle: z.string().min(1).max(120),
  items: z.array(VisualItemSchema).min(1).max(3),
  footerAction: z.string().min(1).max(64).optional(),
}).strict();

export type VisualCardData = z.infer<typeof VisualCardDataSchema>;

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (char) => {
    switch (char) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return char;
    }
  });
}

function wrapLine(value: string, maxChars: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }
    const candidate = `${current} ${word}`;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [value.slice(0, maxChars)];
}

function clampLines(lines: string[], maxLines: number, maxChars: number): string[] {
  const wrapped = lines.flatMap((line) => wrapLine(line, maxChars));
  const clipped = wrapped.slice(0, maxLines);
  if (wrapped.length > maxLines && clipped.length) {
    const lastIndex = clipped.length - 1;
    const last = clipped[lastIndex];
    clipped[lastIndex] = `${last.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
  }
  return clipped;
}

function textRows(lines: string[], x: number, startY: number, lineHeight: number, className: string, bullet = false): string {
  return lines
    .map((line, index) => `<text x="${x}" y="${startY + index * lineHeight}" class="${className}">${bullet ? "• " : ""}${escapeXml(line)}</text>`)
    .join("\n      ");
}

export function generateRetroInfographicSvg(input: VisualCardData): string {
  const data = VisualCardDataSchema.parse(input);
  const status = data.systemStatus ?? "ONLINE";
  const footerCmd = data.footerAction ?? "EXECUTE PIPELINE_";
  const titleLines = clampLines([data.topicTitle], 2, 33);

  const blockTemplates = data.items
    .map((item, index) => {
      const topY = 350 + index * 390;
      const bodyLines = clampLines(item.lines, 4, 48);
      const tag = item.tag.length > 28 ? `${item.tag.slice(0, 27)}…` : item.tag;
      return `
    <!-- BLOCK ${index + 1} -->
    <rect x="80" y="${topY}" width="920" height="340" rx="0" fill="#151922" stroke="${item.tagColor.toUpperCase()}" stroke-width="4"/>
    <rect x="80" y="${topY}" width="470" height="54" fill="${item.tagColor.toUpperCase()}"/>
    <text x="100" y="${topY + 36}" class="pixel-box-title" fill="#0B0E14">[0${index + 1}] ${escapeXml(tag)}</text>
    ${textRows(bodyLines, 120, topY + 122, 58, "pixel-body", true)}`;
    })
    .join("\n");

  const horizontalGrid = Array.from({ length: 25 }, (_, i) => `<line x1="0" y1="${i * 80}" x2="1080" y2="${i * 80}" />`).join("\n    ");
  const verticalGrid = Array.from({ length: 14 }, (_, i) => `<line x1="${i * 80}" y1="0" x2="${i * 80}" y2="1920" />`).join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920" role="img" aria-label="${escapeXml(data.topicTitle)}">
  <defs>
    <style>
      .pixel-header { font-family: monospace; font-weight: 900; fill: #00FF66; font-size: 34px; letter-spacing: 2px; }
      .pixel-subheader { font-family: monospace; font-weight: 900; fill: #00E5FF; font-size: 25px; letter-spacing: 1px; }
      .pixel-box-title { font-family: monospace; font-size: 24px; font-weight: 900; }
      .pixel-body { font-family: monospace; font-weight: 700; fill: #ECEFF4; font-size: 25px; }
      .pixel-credit { font-family: monospace; font-weight: 900; fill: #6B7280; font-size: 20px; letter-spacing: 2px; }
    </style>
    <pattern id="pixelNoise" width="16" height="16" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" x="0" y="0" fill="#00FF66" opacity="0.035"/>
      <rect width="4" height="4" x="8" y="8" fill="#00E5FF" opacity="0.025"/>
    </pattern>
  </defs>

  <rect width="1080" height="1920" fill="#0B0E14"/>
  <rect width="1080" height="1920" fill="url(#pixelNoise)"/>

  <g opacity="0.08" stroke="#00FF66" stroke-width="2" shape-rendering="crispEdges">
    ${horizontalGrid}
    ${verticalGrid}
  </g>

  <rect x="30" y="30" width="1020" height="1860" fill="none" stroke="#1F2430" stroke-width="12" shape-rendering="crispEdges"/>
  <rect x="42" y="42" width="996" height="1836" fill="none" stroke="#00FF66" stroke-width="4" shape-rendering="crispEdges"/>

  <rect x="80" y="100" width="920" height="190" fill="#151922" stroke="#00E5FF" stroke-width="4"/>
  <text x="120" y="166" class="pixel-header">&gt; SYSTEM STATUS: ${escapeXml(status)}</text>
  ${textRows(titleLines, 120, 226, 38, "pixel-subheader")}

  ${blockTemplates}

  <rect x="80" y="1520" width="920" height="180" fill="#151922" stroke="#505A6E" stroke-width="4"/>
  <text x="120" y="1587" class="pixel-subheader" fill="#00FF66">&gt; ${escapeXml(footerCmd)}</text>
  <rect x="120" y="1615" width="22" height="26" fill="#00FF66"/>
  <text x="158" y="1638" class="pixel-body">Deterministic visual pipeline. Zero manual layout.</text>

  <text x="540" y="1810" class="pixel-credit" text-anchor="middle">${CREDIT}</text>
</svg>`;
}

export const VISUAL_OUTPUT = Object.freeze({
  width: 1080,
  height: 1920,
  aspectRatio: "9:16",
  credit: CREDIT,
});
