import { describe, expect, it } from "vitest";
import { runAutonomousTask } from "../src/core/agent.ts";
import { SystemToolExecutor } from "../src/core/tools/executor.ts";
import { toGeminiFunctionDeclarations, toOpenAITools } from "../src/core/tools/providers.ts";
import { SYSTEM_TOOL_DEFINITIONS, TOOL_NAMES } from "../src/core/tools/schema.ts";

const SHOPEE_URL = "https://shopee.co.id/product/123456/987654";

describe("SAMSON system tool registry", () => {
  it("registers only executable v1 tools with unique names", () => {
    expect(SYSTEM_TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
    expect(new Set(TOOL_NAMES).size).toBe(TOOL_NAMES.length);
    expect(TOOL_NAMES).toHaveLength(3);
  });

  it("adapts the internal registry to OpenAI function tools", () => {
    const tools = toOpenAITools();
    expect(tools).toHaveLength(3);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("sanitize_contact_numbers");
    expect(tools[0].function.parameters.additionalProperties).toBe(false);
  });

  it("adapts the internal registry to Gemini function declarations", () => {
    const declarations = toGeminiFunctionDeclarations();
    expect(declarations).toHaveLength(3);
    expect(declarations[0].name).toBe("sanitize_contact_numbers");
    expect(declarations[0].parameters).not.toHaveProperty("additionalProperties");
  });
});

describe("SystemToolExecutor", () => {
  it("normalizes valid Indonesian mobile numbers and rejects invalid values", () => {
    expect(
      SystemToolExecutor.sanitizeContactNumbers([
        "0812-3456-7890",
        "+62 813 4567 8901",
        "12345",
      ]),
    ).toEqual([
      "https://wa.me/6281234567890",
      "https://wa.me/6281345678901",
      "belum ada",
    ]);
  });

  it("returns the destination itself for direct marketing routing", () => {
    const result = SystemToolExecutor.resolveMarketingRoute("Masumi Ads", SHOPEE_URL, "direct");
    expect(result.routingUrl).toBe(SHOPEE_URL);
    expect(result.requiresProvisioning).toBe(false);
    expect(result.suggestedSlug).toBe("masumi-ads");
  });

  it("does not invent an active AppURL route before provider provisioning", () => {
    const result = SystemToolExecutor.resolveMarketingRoute("Snowlab Campaign", SHOPEE_URL, "appurl.io");
    expect(result.provider).toBe("appurl.io");
    expect(result.routingUrl).toBeNull();
    expect(result.requiresProvisioning).toBe(true);
    expect(result.suggestedSlug).toBe("snowlab-campaign");
  });

  it("audits DNS using an injectable deterministic resolver", async () => {
    const result = await SystemToolExecutor.auditDomainDns(
      "dashboard.example.com",
      "203.0.113.10",
      { dnsResolver: async () => ["203.0.113.10", "203.0.113.11"] },
    );

    expect(result.matchesExpectedIp).toBe(true);
    expect(result.observedIps).toEqual(["203.0.113.10", "203.0.113.11"]);
  });
});

describe("runAutonomousTask authorization boundary", () => {
  it("rejects tool names outside the allowlisted registry", async () => {
    const result = await runAutonomousTask({ tool: "run_shell_command", payload: {} });
    expect(result.status).toBe("UNAUTHORIZED_TOOL");
  });

  it("rejects invalid payloads before executor dispatch", async () => {
    const result = await runAutonomousTask({
      tool: "resolve_marketing_route",
      payload: {
        campaignName: "Masumi",
        targetMarketplaceUrl: "http://127.0.0.1/internal",
      },
    });

    expect(result.status).toBe("INVALID_ARGUMENTS");
  });

  it("executes a validated tool call and returns structured data", async () => {
    const result = await runAutonomousTask({
      tool: "sanitize_contact_numbers",
      payload: { rawNumbers: ["081234567890"] },
    });

    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.executedTool).toBe("sanitize_contact_numbers");
      expect(result.data).toEqual(["https://wa.me/6281234567890"]);
    }
  });

  it("executes DNS audit through the agent with a controlled resolver", async () => {
    const result = await runAutonomousTask(
      {
        tool: "audit_domain_dns",
        payload: {
          subdomain: "dashboard.example.com",
          expectedIp: "203.0.113.20",
        },
      },
      { dnsResolver: async () => ["203.0.113.21"] },
    );

    expect(result.status).toBe("SUCCESS");
    if (result.status === "SUCCESS") {
      expect(result.data).toMatchObject({
        matchesExpectedIp: false,
        expectedIp: "203.0.113.20",
      });
    }
  });
});
