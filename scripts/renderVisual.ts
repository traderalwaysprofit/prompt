import fs from "node:fs/promises";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";
import {
  VisualCardDataSchema,
  generateRetroInfographicSvg,
  type VisualCardData,
} from "../src/visual/generator.ts";

const DEFAULT_PAYLOAD: VisualCardData = {
  systemStatus: "OPTIMIZED",
  topicTitle: "RULE EKSEKUSI TRADING & INFRA",
  items: [
    {
      tag: "RISK MANAGEMENT",
      tagColor: "#FF0055",
      lines: [
        "Max risk per open trade: 1%",
        "SL wajib terpasang di market order",
        "Cut loss deterministik tanpa kompromi",
        "RR minimum 1:2 setup only",
      ],
    },
    {
      tag: "EXECUTION PIPELINE",
      tagColor: "#00FF66",
      lines: [
        "Check high-impact economic calendar",
        "Konfirmasi level SnR & liquidity sweep",
        "Validasi spread & latency VPS",
        "Entry signal strict checklist",
      ],
    },
    {
      tag: "AUTOMATION GUARD",
      tagColor: "#FFFF00",
      lines: [
        "Trailing stop otomatis via EA/Script",
        "Alerting Telegram/WA bila drawdown > 3%",
        "Auto-disconnect saat weekend roll",
        "Audit mingguan via trading journal",
      ],
    },
  ],
  footerAction: "DEPLOY DISCIPLINE_",
};

interface CliOptions {
  input?: string;
  outputDir: string;
  name: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    outputDir: "dist-visuals",
    name: "forex-rule-card",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value) continue;

    if (flag === "--input") {
      options.input = value;
      index += 1;
    } else if (flag === "--outdir") {
      options.outputDir = value;
      index += 1;
    } else if (flag === "--name") {
      options.name = value;
      index += 1;
    }
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(options.name)) {
    throw new Error("Output name must contain only letters, numbers, dot, underscore, or hyphen.");
  }

  return options;
}

async function loadPayload(inputPath?: string): Promise<VisualCardData> {
  if (!inputPath) return DEFAULT_PAYLOAD;
  const absolutePath = path.resolve(process.cwd(), inputPath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed: unknown = JSON.parse(raw);
  return VisualCardDataSchema.parse(parsed);
}

export function renderSvgToPng(svgString: string): Uint8Array {
  const renderer = new Resvg(svgString, {
    fitTo: { mode: "width", value: 1080 },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: "monospace",
    },
  });
  return renderer.render().asPng();
}

export async function buildPoster(options = parseArgs(process.argv.slice(2))): Promise<{ svgPath: string; pngPath: string }> {
  const payload = await loadPayload(options.input);
  const svgString = generateRetroInfographicSvg(payload);
  const outputDir = path.resolve(process.cwd(), options.outputDir);
  await fs.mkdir(outputDir, { recursive: true });

  const svgPath = path.join(outputDir, `${options.name}.svg`);
  const pngPath = path.join(outputDir, `${options.name}.png`);

  await fs.writeFile(svgPath, svgString, "utf8");
  await fs.writeFile(pngPath, renderSvgToPng(svgString));

  console.log("[PIPELINE SUCCESS] Headless visual generated");
  console.log(`SVG: ${svgPath}`);
  console.log(`PNG: ${pngPath}`);
  return { svgPath, pngPath };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildPoster().catch((error: unknown) => {
    console.error("[VISUAL PIPELINE FAILED]", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  });
}
