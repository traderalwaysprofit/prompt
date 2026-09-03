import { z } from "zod";

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}

export const TOOL_NAMES = [
  "sanitize_contact_numbers",
  "resolve_marketing_route",
  "audit_domain_dns",
] as const;

export type ToolName = (typeof TOOL_NAMES)[number];

const indonesiaPhoneInputSchema = z.string().trim().min(1).max(64);

export const SanitizeContactNumbersArgsSchema = z
  .object({
    rawNumbers: z.array(indonesiaPhoneInputSchema).min(1).max(1000),
  })
  .strict();

const shopeeTargetUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const hostname = url.hostname.toLowerCase();
    return (
      hostname === "shopee.co.id" ||
      hostname.endsWith(".shopee.co.id") ||
      hostname === "shope.ee" ||
      hostname.endsWith(".shope.ee")
    );
  }, "targetMarketplaceUrl harus berupa URL HTTPS Shopee yang valid");

export const ResolveMarketingRouteArgsSchema = z
  .object({
    campaignName: z.string().trim().min(1).max(120),
    targetMarketplaceUrl: shopeeTargetUrlSchema,
    routingProvider: z.enum(["appurl.io", "direct"]).default("appurl.io"),
  })
  .strict();

function isValidHostname(value: string): boolean {
  if (value.length > 253 || value.includes("://") || value.includes("/")) return false;
  const labels = value.split(".");
  if (labels.length < 2) return false;

  return labels.every(
    (label) =>
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label),
  );
}

function isValidIpv4(value: string): boolean {
  const parts = value.split(".");
  if (parts.length !== 4) return false;

  return parts.every((part) => {
    if (!/^\d{1,3}$/.test(part)) return false;
    if (part.length > 1 && part.startsWith("0")) return false;
    const numeric = Number(part);
    return numeric >= 0 && numeric <= 255;
  });
}

export const AuditDomainDnsArgsSchema = z
  .object({
    subdomain: z.string().trim().toLowerCase().refine(isValidHostname, "Sub-domain tidak valid"),
    expectedIp: z.string().trim().refine(isValidIpv4, "expectedIp harus IPv4 yang valid"),
  })
  .strict();

export const TOOL_ARGUMENT_SCHEMAS = {
  sanitize_contact_numbers: SanitizeContactNumbersArgsSchema,
  resolve_marketing_route: ResolveMarketingRouteArgsSchema,
  audit_domain_dns: AuditDomainDnsArgsSchema,
} as const;

export const SYSTEM_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "sanitize_contact_numbers",
    description:
      "Memvalidasi nomor telepon Indonesia dan mengonversinya ke link WhatsApp deterministik wa.me/62... atau 'belum ada'.",
    parameters: {
      type: "object",
      properties: {
        rawNumbers: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 1000,
          description: "List nomor telepon mentah dari database leads atau campaign.",
        },
      },
      required: ["rawNumbers"],
      additionalProperties: false,
    },
  },
  {
    name: "resolve_marketing_route",
    description:
      "Membuat rencana routing traffic Meta/TikTok Ads menuju URL Shopee. Route AppURL dilabeli membutuhkan provisioning sampai benar-benar dibuat di provider.",
    parameters: {
      type: "object",
      properties: {
        campaignName: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          description: "Nama campaign atau brand, misalnya Snowlab, FIJN, atau Masumi.",
        },
        targetMarketplaceUrl: {
          type: "string",
          maxLength: 2048,
          description: "URL HTTPS toko atau produk Shopee tujuan.",
        },
        routingProvider: {
          type: "string",
          enum: ["appurl.io", "direct"],
          description: "Provider routing. Default runtime: appurl.io.",
        },
      },
      required: ["campaignName", "targetMarketplaceUrl"],
      additionalProperties: false,
    },
  },
  {
    name: "audit_domain_dns",
    description:
      "Memeriksa DNS A record sub-domain dan membandingkannya dengan IPv4 VPS yang diharapkan.",
    parameters: {
      type: "object",
      properties: {
        subdomain: {
          type: "string",
          description: "Sub-domain yang dicek, misalnya dashboard.sumberpelitamataram.com.",
        },
        expectedIp: {
          type: "string",
          description: "Alamat IPv4 VPS target.",
        },
      },
      required: ["subdomain", "expectedIp"],
      additionalProperties: false,
    },
  },
];

export function isToolName(value: string): value is ToolName {
  return (TOOL_NAMES as readonly string[]).includes(value);
}
