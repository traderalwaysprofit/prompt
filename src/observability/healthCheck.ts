import { z } from "zod";
import { AlertManager, type SystemIncident } from "./alertManager.ts";
import { sanitizeExternalHttpsUrl } from "./urlPolicy.ts";

const DEFAULT_TIMEOUT_MS = 4000;
const MIN_TIMEOUT_MS = 1000;
const MAX_TIMEOUT_MS = 10000;

const MonitoredTargetSchema = z.object({
  name: z.string().min(1).max(120),
  url: z.string().min(1).max(2048),
  fallbackUrl: z.string().min(1).max(2048).optional(),
  type: z.enum(["REDIRECTOR", "VPS_DASHBOARD", "API"]),
}).strict();

const MonitoredTargetListSchema = z.array(MonitoredTargetSchema).max(12);

export type MonitoredTargetType = z.infer<typeof MonitoredTargetSchema>["type"];

export interface ObservabilityEnv {
  OBSERVABILITY_ENABLED?: string;
  OBSERVABILITY_TARGETS_JSON?: string;
  OBSERVABILITY_TIMEOUT_MS?: string;
  ALERT_WEBHOOK_URL?: string;
}

interface ConfiguredTarget {
  name: string;
  type: MonitoredTargetType;
  fetchUrl: string;
  publicUrl: string;
  fallbackFetchUrl?: string;
  fallbackPublicUrl?: string;
}

export interface ProbeResult {
  healthy: boolean;
  statusCode?: number;
  message: string;
  latencyMs: number;
}

export interface TargetHealthResult {
  service: string;
  type: MonitoredTargetType;
  target: string;
  status: "UP" | "DOWN";
  statusCode?: number;
  latencyMs: number;
  fallback?: {
    target: string;
    status: "READY" | "UNAVAILABLE";
    statusCode?: number;
    latencyMs: number;
  };
}

export interface HealthCheckSummary {
  enabled: boolean;
  checked: number;
  healthy: number;
  incidents: number;
  configErrors: number;
  startedAt: string;
  finishedAt: string;
  targets: TargetHealthResult[];
}

export interface HealthCheckDependencies {
  fetchImpl?: typeof fetch;
  dispatchIncident?: (incident: SystemIncident, webhookUrl?: string) => Promise<unknown>;
  now?: () => Date;
}

function getTimeoutMs(rawValue?: string): number {
  const parsed = Number(rawValue ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.trunc(parsed)));
}

function readTargets(env: ObservabilityEnv): { targets: ConfiguredTarget[]; configErrors: number } {
  if (!env.OBSERVABILITY_TARGETS_JSON?.trim()) return { targets: [], configErrors: 0 };

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(env.OBSERVABILITY_TARGETS_JSON);
  } catch {
    console.error("[OBSERVABILITY_CONFIG_INVALID_JSON]");
    return { targets: [], configErrors: 1 };
  }

  const parsed = MonitoredTargetListSchema.safeParse(parsedJson);
  if (!parsed.success) {
    console.error("[OBSERVABILITY_CONFIG_SCHEMA_REJECTED]");
    return { targets: [], configErrors: parsed.error.issues.length };
  }

  const targets: ConfiguredTarget[] = [];
  let configErrors = 0;

  for (const target of parsed.data) {
    const primary = sanitizeExternalHttpsUrl(target.url);
    if (!primary.isValid || !primary.sanitizedUrl || !primary.publicUrl) {
      configErrors += 1;
      console.error("[OBSERVABILITY_TARGET_REJECTED]", target.name);
      continue;
    }

    let fallbackFetchUrl: string | undefined;
    let fallbackPublicUrl: string | undefined;
    if (target.fallbackUrl) {
      const fallback = sanitizeExternalHttpsUrl(target.fallbackUrl);
      if (fallback.isValid && fallback.sanitizedUrl && fallback.publicUrl) {
        fallbackFetchUrl = fallback.sanitizedUrl;
        fallbackPublicUrl = fallback.publicUrl;
      } else {
        configErrors += 1;
        console.error("[OBSERVABILITY_FALLBACK_REJECTED]", target.name);
      }
    }

    targets.push({
      name: target.name,
      type: target.type,
      fetchUrl: primary.sanitizedUrl,
      publicUrl: primary.publicUrl,
      fallbackFetchUrl,
      fallbackPublicUrl,
    });
  }

  return { targets, configErrors };
}

async function probeUrl(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<ProbeResult> {
  const controller = new AbortController();
  const started = Date.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "Accept": "text/html,application/json;q=0.9,*/*;q=0.8" },
    });

    const latencyMs = Date.now() - started;
    const healthy = response.status >= 200 && response.status < 400;
    return {
      healthy,
      statusCode: response.status,
      message: healthy ? "Healthy response" : "Unhealthy status code returned",
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - started;
    const isTimeout = controller.signal.aborted || (error instanceof Error && error.name === "AbortError");
    return {
      healthy: false,
      message: isTimeout ? `Connection timed out (>${timeoutMs}ms)` : "DNS/Network unreachable",
      latencyMs,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function checkTarget(
  target: ConfiguredTarget,
  env: ObservabilityEnv,
  timeoutMs: number,
  deps: Required<Pick<HealthCheckDependencies, "fetchImpl" | "dispatchIncident" | "now">>,
): Promise<TargetHealthResult> {
  const primary = await probeUrl(target.fetchUrl, timeoutMs, deps.fetchImpl);
  if (primary.healthy) {
    return {
      service: target.name,
      type: target.type,
      target: target.publicUrl,
      status: "UP",
      statusCode: primary.statusCode,
      latencyMs: primary.latencyMs,
    };
  }

  let fallback: TargetHealthResult["fallback"];
  let recoveryAction: SystemIncident["recoveryAction"] = "MANUAL_REQUIRED";

  if (target.fallbackFetchUrl && target.fallbackPublicUrl) {
    const fallbackProbe = await probeUrl(target.fallbackFetchUrl, timeoutMs, deps.fetchImpl);
    fallback = {
      target: target.fallbackPublicUrl,
      status: fallbackProbe.healthy ? "READY" : "UNAVAILABLE",
      statusCode: fallbackProbe.statusCode,
      latencyMs: fallbackProbe.latencyMs,
    };
    recoveryAction = fallbackProbe.healthy ? "FALLBACK_READY" : "FALLBACK_UNAVAILABLE";
  }

  const incident: SystemIncident = {
    service: target.name,
    target: target.publicUrl,
    status: "DOWN",
    statusCode: primary.statusCode,
    message: primary.message,
    timestamp: deps.now().toISOString(),
    recoveryAction,
    fallbackTarget: fallback?.status === "READY" ? fallback.target : undefined,
  };

  await deps.dispatchIncident(incident, env.ALERT_WEBHOOK_URL);

  return {
    service: target.name,
    type: target.type,
    target: target.publicUrl,
    status: "DOWN",
    statusCode: primary.statusCode,
    latencyMs: primary.latencyMs,
    fallback,
  };
}

/**
 * Cloudflare Scheduled-event health engine. It is fail-closed and disabled by
 * default. Target URLs are operator-configured rather than hard-coded so an
 * unverified third-party health endpoint cannot create permanent false alarms.
 */
export async function runHealthCheckEngine(
  env: ObservabilityEnv,
  dependencies: HealthCheckDependencies = {},
): Promise<HealthCheckSummary> {
  const now = dependencies.now ?? (() => new Date());
  const startedAt = now().toISOString();

  if (env.OBSERVABILITY_ENABLED !== "true") {
    return {
      enabled: false,
      checked: 0,
      healthy: 0,
      incidents: 0,
      configErrors: 0,
      startedAt,
      finishedAt: now().toISOString(),
      targets: [],
    };
  }

  const { targets, configErrors } = readTargets(env);
  const timeoutMs = getTimeoutMs(env.OBSERVABILITY_TIMEOUT_MS);
  const deps = {
    fetchImpl: dependencies.fetchImpl ?? fetch,
    dispatchIncident: dependencies.dispatchIncident ?? ((incident, webhookUrl) => AlertManager.dispatch(incident, webhookUrl)),
    now,
  };

  const results = await Promise.all(targets.map((target) => checkTarget(target, env, timeoutMs, deps)));
  const healthy = results.filter((result) => result.status === "UP").length;
  const incidents = results.length - healthy;

  const summary: HealthCheckSummary = {
    enabled: true,
    checked: results.length,
    healthy,
    incidents,
    configErrors,
    startedAt,
    finishedAt: now().toISOString(),
    targets: results,
  };

  console.log("[OBSERVABILITY_RUN]", JSON.stringify({
    enabled: summary.enabled,
    checked: summary.checked,
    healthy: summary.healthy,
    incidents: summary.incidents,
    configErrors: summary.configErrors,
    startedAt: summary.startedAt,
    finishedAt: summary.finishedAt,
  }));

  return summary;
}
