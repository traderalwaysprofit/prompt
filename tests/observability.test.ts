import { afterEach, describe, expect, it, vi } from "vitest";
import { AlertManager, type SystemIncident } from "../src/observability/alertManager.ts";
import { runHealthCheckEngine } from "../src/observability/healthCheck.ts";
import { sanitizeExternalHttpsUrl } from "../src/observability/urlPolicy.ts";

const FIXED_DATE = new Date("2026-09-04T00:00:00.000Z");

function incident(overrides: Partial<SystemIncident> = {}): SystemIncident {
  return {
    service: "Marketing Redirector",
    target: "https://redirect.example.com/health",
    status: "DOWN",
    statusCode: 503,
    message: "Unhealthy status code returned",
    timestamp: FIXED_DATE.toISOString(),
    recoveryAction: "MANUAL_REQUIRED",
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("observability URL policy", () => {
  it("rejects non-HTTPS and private/internal targets", () => {
    expect(sanitizeExternalHttpsUrl("http://example.com").isValid).toBe(false);
    expect(sanitizeExternalHttpsUrl("https://localhost/health").isValid).toBe(false);
    expect(sanitizeExternalHttpsUrl("https://127.0.0.1/health").isValid).toBe(false);
    expect(sanitizeExternalHttpsUrl("https://169.254.169.254/latest/meta-data/").isValid).toBe(false);
  });

  it("retains signed query data for fetch but removes it from telemetry", () => {
    const result = sanitizeExternalHttpsUrl("https://status.example.com/health?token=secret#fragment");
    expect(result.isValid).toBe(true);
    expect(result.sanitizedUrl).toBe("https://status.example.com/health?token=secret");
    expect(result.publicUrl).toBe("https://status.example.com/health");
  });
});

describe("AlertManager", () => {
  it("does not claim a failover was executed when only a fallback was verified", () => {
    const message = AlertManager.formatIncidentMessage(incident({
      recoveryAction: "FALLBACK_READY",
      fallbackTarget: "https://shopee.example.com/store",
    }));

    expect(message).toContain("Verified fallback is available");
    expect(message).toContain("requires an authorized executor");
    expect(message).not.toContain("initiated");
  });

  it("rejects unsafe webhook URLs without making a request", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchImpl = vi.fn();
    const result = await AlertManager.dispatch(
      incident(),
      "https://127.0.0.1/whatsapp",
      { fetchImpl: fetchImpl as unknown as typeof fetch },
    );

    expect(result).toMatchObject({ delivered: false, reason: "INVALID_WEBHOOK" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("posts a sanitized incident payload to a valid HTTPS webhook", async () => {
    let observedUrl: string | undefined;
    let observedInit: RequestInit | undefined;
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      observedUrl = String(input);
      observedInit = init;
      return new Response("ok", { status: 200 });
    };

    const result = await AlertManager.dispatch(
      incident(),
      "https://alerts.example.com/hook?key=private",
      { fetchImpl: fetchImpl as typeof fetch },
    );

    expect(result.delivered).toBe(true);
    expect(observedUrl).toBe("https://alerts.example.com/hook?key=private");
    expect(observedInit?.redirect).toBe("error");
  });
});

describe("runHealthCheckEngine", () => {
  it("is fail-closed and makes no network requests while disabled", async () => {
    const fetchImpl = vi.fn();
    const result = await runHealthCheckEngine(
      {
        OBSERVABILITY_ENABLED: "false",
        OBSERVABILITY_TARGETS_JSON: JSON.stringify([
          { name: "Example", url: "https://example.com/health", type: "API" },
        ]),
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => FIXED_DATE },
    );

    expect(result.enabled).toBe(false);
    expect(result.checked).toBe(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("marks 2xx and 3xx responses healthy without dispatching an incident", async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302 }));
    const dispatchIncident = vi.fn(async (_value: SystemIncident, _webhookUrl?: string) => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await runHealthCheckEngine(
      {
        OBSERVABILITY_ENABLED: "true",
        OBSERVABILITY_TARGETS_JSON: JSON.stringify([
          { name: "SPM Dashboard", url: "https://dashboard.example.com", type: "VPS_DASHBOARD" },
        ]),
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        dispatchIncident,
        now: () => FIXED_DATE,
      },
    );

    expect(result).toMatchObject({ checked: 1, healthy: 1, incidents: 0 });
    expect(result.targets[0].status).toBe("UP");
    expect(dispatchIncident).not.toHaveBeenCalled();
  });

  it("verifies a fallback before marking it ready and redacts signed query data", async () => {
    const fetchImpl = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.startsWith("https://redirect.example.com/")) return new Response("down", { status: 503 });
      if (url.startsWith("https://fallback.example.com/")) return new Response("ok", { status: 200 });
      return new Response("missing", { status: 404 });
    };
    let capturedIncident: SystemIncident | undefined;
    const dispatchIncident = vi.fn(async (value: SystemIncident, _webhookUrl?: string) => {
      capturedIncident = value;
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    const result = await runHealthCheckEngine(
      {
        OBSERVABILITY_ENABLED: "true",
        OBSERVABILITY_TARGETS_JSON: JSON.stringify([
          {
            name: "Marketing Redirector",
            url: "https://redirect.example.com/health?token=primary-secret",
            fallbackUrl: "https://fallback.example.com/store?token=fallback-secret",
            type: "REDIRECTOR",
          },
        ]),
      },
      {
        fetchImpl: fetchImpl as typeof fetch,
        dispatchIncident,
        now: () => FIXED_DATE,
      },
    );

    expect(result).toMatchObject({ checked: 1, healthy: 0, incidents: 1 });
    expect(result.targets[0].target).toBe("https://redirect.example.com/health");
    expect(result.targets[0].fallback).toMatchObject({
      target: "https://fallback.example.com/store",
      status: "READY",
    });

    expect(dispatchIncident).toHaveBeenCalledTimes(1);
    expect(capturedIncident).toMatchObject({
      recoveryAction: "FALLBACK_READY",
      target: "https://redirect.example.com/health",
      fallbackTarget: "https://fallback.example.com/store",
    });
  });

  it("requires manual recovery when a failed target has no verified fallback", async () => {
    const fetchImpl = vi.fn(async () => new Response("down", { status: 500 }));
    let capturedIncident: SystemIncident | undefined;
    const dispatchIncident = vi.fn(async (value: SystemIncident, _webhookUrl?: string) => {
      capturedIncident = value;
    });
    vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runHealthCheckEngine(
      {
        OBSERVABILITY_ENABLED: "true",
        OBSERVABILITY_TARGETS_JSON: JSON.stringify([
          { name: "API", url: "https://api.example.com/health", type: "API" },
        ]),
      },
      {
        fetchImpl: fetchImpl as unknown as typeof fetch,
        dispatchIncident,
        now: () => FIXED_DATE,
      },
    );

    expect(capturedIncident).toMatchObject({ recoveryAction: "MANUAL_REQUIRED" });
  });

  it("fails closed on malformed target configuration", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const fetchImpl = vi.fn();

    const result = await runHealthCheckEngine(
      {
        OBSERVABILITY_ENABLED: "true",
        OBSERVABILITY_TARGETS_JSON: "{not-json}",
      },
      { fetchImpl: fetchImpl as unknown as typeof fetch, now: () => FIXED_DATE },
    );

    expect(result.checked).toBe(0);
    expect(result.configErrors).toBe(1);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
