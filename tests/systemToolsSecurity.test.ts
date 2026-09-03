import { describe, expect, it } from "vitest";
import { runAutonomousTask } from "../src/core/agent.ts";

describe("system tool error disclosure boundary", () => {
  it("does not expose executor exception messages to callers", async () => {
    const secretDiagnostic = "SECRET_INTERNAL_STACK_DETAIL /srv/private/tool.ts:99";

    const result = await runAutonomousTask(
      {
        tool: "audit_domain_dns",
        payload: {
          subdomain: "dashboard.example.com",
          expectedIp: "203.0.113.20",
        },
      },
      {
        dnsResolver: async () => {
          throw new Error(secretDiagnostic);
        },
      },
    );

    expect(result.status).toBe("EXECUTION_ERROR");
    if (result.status === "EXECUTION_ERROR") {
      expect(result.error).toBe("Tool execution failed.");
      expect(result.error).not.toContain(secretDiagnostic);
      expect(result.error).not.toContain("/srv/private");
    }
  });
});
