import {
  AuditDomainDnsArgsSchema,
  ResolveMarketingRouteArgsSchema,
  SanitizeContactNumbersArgsSchema,
  type ToolName,
} from "./schema.ts";

export type DnsResolver = (hostname: string) => Promise<string[]>;

export interface ToolExecutionContext {
  dnsResolver?: DnsResolver;
}

export interface MarketingRouteResult {
  success: true;
  provider: "appurl.io" | "direct";
  destination: string;
  routingUrl: string | null;
  suggestedSlug: string;
  requiresProvisioning: boolean;
}

export interface DnsAuditResult {
  success: true;
  subdomain: string;
  expectedIp: string;
  observedIps: string[];
  matchesExpectedIp: boolean;
}

type DnsJsonResponse = {
  Answer?: Array<{
    type?: number;
    data?: string;
  }>;
};

async function resolveDnsARecordWithCloudflare(hostname: string): Promise<string[]> {
  const endpoint = new URL("https://cloudflare-dns.com/dns-query");
  endpoint.searchParams.set("name", hostname);
  endpoint.searchParams.set("type", "A");

  const response = await fetch(endpoint, {
    headers: {
      accept: "application/dns-json",
    },
  });

  if (!response.ok) {
    throw new Error(`DNS resolver gagal dengan status ${response.status}.`);
  }

  const payload = (await response.json()) as DnsJsonResponse;
  const records = (payload.Answer ?? [])
    .filter((answer) => answer.type === 1 && typeof answer.data === "string")
    .map((answer) => answer.data as string);

  return [...new Set(records)].sort();
}

function campaignSlug(campaign: string): string {
  const slug = campaign
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  return slug || "campaign";
}

export class SystemToolExecutor {
  static sanitizeContactNumbers(rawNumbers: string[]): string[] {
    const { rawNumbers: validatedNumbers } = SanitizeContactNumbersArgsSchema.parse({ rawNumbers });

    return validatedNumbers.map((phone) => {
      const cleaned = phone.replace(/\D/g, "");
      if (!/^(?:08|628)\d{8,11}$/.test(cleaned)) return "belum ada";

      const formatted = cleaned.startsWith("0") ? `62${cleaned.slice(1)}` : cleaned;
      return `https://wa.me/${formatted}`;
    });
  }

  static resolveMarketingRoute(
    campaignName: string,
    targetMarketplaceUrl: string,
    routingProvider: "appurl.io" | "direct" = "appurl.io",
  ): MarketingRouteResult {
    const args = ResolveMarketingRouteArgsSchema.parse({
      campaignName,
      targetMarketplaceUrl,
      routingProvider,
    });
    const suggestedSlug = campaignSlug(args.campaignName);

    if (args.routingProvider === "direct") {
      return {
        success: true,
        provider: "direct",
        destination: args.targetMarketplaceUrl,
        routingUrl: args.targetMarketplaceUrl,
        suggestedSlug,
        requiresProvisioning: false,
      };
    }

    return {
      success: true,
      provider: "appurl.io",
      destination: args.targetMarketplaceUrl,
      routingUrl: null,
      suggestedSlug,
      requiresProvisioning: true,
    };
  }

  static async auditDomainDns(
    subdomain: string,
    expectedIp: string,
    context: ToolExecutionContext = {},
  ): Promise<DnsAuditResult> {
    const args = AuditDomainDnsArgsSchema.parse({ subdomain, expectedIp });
    const resolver = context.dnsResolver ?? resolveDnsARecordWithCloudflare;
    const observedIps = [...new Set(await resolver(args.subdomain))].sort();

    return {
      success: true,
      subdomain: args.subdomain,
      expectedIp: args.expectedIp,
      observedIps,
      matchesExpectedIp: observedIps.includes(args.expectedIp),
    };
  }

  static async execute(
    toolName: ToolName,
    args: Record<string, unknown>,
    context: ToolExecutionContext = {},
  ): Promise<unknown> {
    switch (toolName) {
      case "sanitize_contact_numbers": {
        const parsed = SanitizeContactNumbersArgsSchema.parse(args);
        return this.sanitizeContactNumbers(parsed.rawNumbers);
      }
      case "resolve_marketing_route": {
        const parsed = ResolveMarketingRouteArgsSchema.parse(args);
        return this.resolveMarketingRoute(
          parsed.campaignName,
          parsed.targetMarketplaceUrl,
          parsed.routingProvider,
        );
      }
      case "audit_domain_dns": {
        const parsed = AuditDomainDnsArgsSchema.parse(args);
        return this.auditDomainDns(parsed.subdomain, parsed.expectedIp, context);
      }
    }
  }
}
