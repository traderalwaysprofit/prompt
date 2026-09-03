import { sanitizeExternalHttpsUrl } from "./urlPolicy.ts";

export type IncidentStatus = "DEGRADED" | "DOWN";
export type RecoveryAction = "FALLBACK_READY" | "FALLBACK_UNAVAILABLE" | "MANUAL_REQUIRED";

export interface SystemIncident {
  service: string;
  target: string;
  status: IncidentStatus;
  statusCode?: number;
  message: string;
  timestamp: string;
  recoveryAction: RecoveryAction;
  fallbackTarget?: string;
}

export interface AlertDispatchResult {
  delivered: boolean;
  channel: "webhook" | "log";
  reason?: "NOT_CONFIGURED" | "INVALID_WEBHOOK" | "UPSTREAM_REJECTED" | "NETWORK_FAILURE";
  statusCode?: number;
}

export interface AlertDispatchOptions {
  fetchImpl?: typeof fetch;
}

function recoveryLine(incident: SystemIncident): string {
  if (incident.recoveryAction === "FALLBACK_READY" && incident.fallbackTarget) {
    return `Action: Verified fallback is available at ${incident.fallbackTarget}. Route change requires an authorized executor.`;
  }
  if (incident.recoveryAction === "FALLBACK_UNAVAILABLE") {
    return "Action: Configured fallback is also unavailable. Manual recovery required.";
  }
  return "Action: Manual recovery required; no verified fallback is available.";
}

export class AlertManager {
  static formatIncidentMessage(incident: SystemIncident): string {
    return [
      `🚨 [SYSTEM ALERT: ${incident.status}]`,
      `Service: ${incident.service}`,
      `Target: ${incident.target}`,
      `Error: ${incident.message} (HTTP ${incident.statusCode ?? "N/A"})`,
      `Timestamp: ${incident.timestamp}`,
      recoveryLine(incident),
    ].join("\n");
  }

  /**
   * Sends an incident to an operator-configured HTTPS webhook. Redirects are
   * rejected so a trusted webhook cannot silently redirect the Worker toward an
   * internal address. No caught exception details are exposed or logged.
   */
  static async dispatch(
    incident: SystemIncident,
    alertWebhookUrl?: string,
    options: AlertDispatchOptions = {},
  ): Promise<AlertDispatchResult> {
    const payload = {
      text: this.formatIncidentMessage(incident),
      source: "SAMSON_OBSERVABILITY_EDGE",
    };

    if (!alertWebhookUrl) {
      console.error("[CRITICAL_UNNOTIFIED_ALERT]", JSON.stringify(payload));
      return { delivered: false, channel: "log", reason: "NOT_CONFIGURED" };
    }

    const webhook = sanitizeExternalHttpsUrl(alertWebhookUrl);
    if (!webhook.isValid || !webhook.sanitizedUrl) {
      console.error("[ALERT_WEBHOOK_REJECTED]");
      return { delivered: false, channel: "log", reason: "INVALID_WEBHOOK" };
    }

    const fetchImpl = options.fetchImpl ?? fetch;
    try {
      const response = await fetchImpl(webhook.sanitizedUrl, {
        method: "POST",
        redirect: "error",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("[ALERT_DISPATCH_REJECTED]", response.status);
        return {
          delivered: false,
          channel: "webhook",
          reason: "UPSTREAM_REJECTED",
          statusCode: response.status,
        };
      }

      return { delivered: true, channel: "webhook", statusCode: response.status };
    } catch {
      console.error("[ALERT_DISPATCH_FAILURE]");
      return { delivered: false, channel: "webhook", reason: "NETWORK_FAILURE" };
    }
  }
}
