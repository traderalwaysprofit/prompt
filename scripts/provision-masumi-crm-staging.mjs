import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const DEFAULT_HOSTNAME = 'crm-preview.samson.web.id';
const DEFAULT_APP_NAME = 'MASUMI CRM Preview';
const DEFAULT_POLICY_NAME = 'MASUMI CRM Preview Allow';
const ACCOUNT_ID_PATTERN = /^[0-9a-f]{32}$/i;

const fail = (message) => {
  throw new Error(message);
};

export const normalizePreviewHostname = (value = DEFAULT_HOSTNAME) => {
  const hostname = String(value || '').trim().toLowerCase();
  if (!hostname.endsWith('.samson.web.id') || !hostname.includes('preview')) {
    fail('CRM staging hostname must be a preview hostname under samson.web.id.');
  }
  if (hostname === 'crm.samson.web.id') {
    fail('Production hostname is not allowed in the staging provisioner.');
  }
  return hostname;
};

export const normalizeEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 320 || !email.includes('@')) {
    fail('CRM_PREVIEW_ADMIN_EMAIL must be a valid email address.');
  }
  return email;
};

export const normalizeAccountId = (value) => {
  const accountId = String(value || '').trim();
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    fail('CLOUDFLARE_ACCOUNT_ID must be a 32-character Cloudflare account ID.');
  }
  return accountId;
};

const unwrapCloudflare = async (response) => {
  let payload;
  try {
    payload = await response.json();
  } catch {
    fail(`Cloudflare API returned non-JSON HTTP ${response.status}.`);
  }

  if (!response.ok || payload?.success === false) {
    const messages = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => error?.message).filter(Boolean).join('; ')
      : '';
    fail(`Cloudflare API request failed (${response.status})${messages ? `: ${messages}` : '.'}`);
  }

  return payload?.result;
};

export const cloudflareRequest = async ({
  accountId,
  token,
  path,
  method = 'GET',
  body,
  fetcher = globalThis.fetch
}) => {
  if (typeof fetcher !== 'function') fail('A fetch implementation is required.');
  if (!token) fail('CLOUDFLARE_API_TOKEN is required.');

  const response = await fetcher(`${API_BASE}/accounts/${accountId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  return unwrapCloudflare(response);
};

const appMatchesHostname = (app, hostname) => {
  if (String(app?.domain || '').toLowerCase() === hostname) return true;
  return Array.isArray(app?.destinations) && app.destinations.some((destination) => (
    destination?.type === 'public' && String(destination?.uri || '').toLowerCase() === hostname
  ));
};

export const ensureAccessApplication = async ({
  accountId,
  token,
  hostname,
  appName = DEFAULT_APP_NAME,
  fetcher = globalThis.fetch
}) => {
  const apps = await cloudflareRequest({
    accountId,
    token,
    path: '/access/apps?per_page=100',
    fetcher
  });
  const list = Array.isArray(apps) ? apps : [];
  const byHostname = list.find((app) => appMatchesHostname(app, hostname));
  const nameCollision = list.find((app) => app?.name === appName && !appMatchesHostname(app, hostname));

  if (nameCollision) {
    fail(`Access application name "${appName}" already exists for a different hostname.`);
  }

  if (byHostname) {
    if (byHostname.type !== 'self_hosted') {
      fail(`Existing Access application for ${hostname} is not self_hosted.`);
    }
    if (!byHostname.id || !byHostname.aud) {
      fail(`Existing Access application for ${hostname} is missing id or audience tag.`);
    }
    return { action: 'reused', app: byHostname };
  }

  const app = await cloudflareRequest({
    accountId,
    token,
    path: '/access/apps',
    method: 'POST',
    body: {
      name: appName,
      type: 'self_hosted',
      domain: hostname,
      destinations: [{ type: 'public', uri: hostname }],
      session_duration: '8h',
      app_launcher_visible: false
    },
    fetcher
  });

  if (!app?.id || !app?.aud) fail('Created Access application is missing id or audience tag.');
  return { action: 'created', app };
};

const policyHasEmail = (policy, email) => (
  policy?.decision === 'allow' &&
  Array.isArray(policy?.include) &&
  policy.include.length === 1 &&
  policy.include[0]?.email?.email?.toLowerCase() === email
);

export const ensureAccessPolicy = async ({
  accountId,
  token,
  appId,
  adminEmail,
  policyName = DEFAULT_POLICY_NAME,
  fetcher = globalThis.fetch
}) => {
  const policies = await cloudflareRequest({
    accountId,
    token,
    path: `/access/apps/${appId}/policies?per_page=100`,
    fetcher
  });
  const list = Array.isArray(policies) ? policies : [];
  const existing = list.find((policy) => policy?.name === policyName);
  const desired = {
    name: policyName,
    decision: 'allow',
    precedence: 1,
    include: [{ email: { email: adminEmail } }],
    exclude: [],
    require: []
  };

  if (existing && policyHasEmail(existing, adminEmail)) {
    return { action: 'reused', policy: existing };
  }

  if (existing?.id) {
    const policy = await cloudflareRequest({
      accountId,
      token,
      path: `/access/apps/${appId}/policies/${existing.id}`,
      method: 'PUT',
      body: desired,
      fetcher
    });
    return { action: 'updated', policy };
  }

  const policy = await cloudflareRequest({
    accountId,
    token,
    path: `/access/apps/${appId}/policies`,
    method: 'POST',
    body: desired,
    fetcher
  });
  return { action: 'created', policy };
};

export const resolveAccessIssuer = async ({
  accountId,
  token,
  fetcher = globalThis.fetch
}) => {
  const organization = await cloudflareRequest({
    accountId,
    token,
    path: '/access/organizations',
    fetcher
  });
  const authDomain = String(organization?.auth_domain || '').trim().toLowerCase();
  if (!authDomain.endsWith('.cloudflareaccess.com')) {
    fail('Cloudflare Zero Trust organization auth_domain is missing or invalid.');
  }
  return `https://${authDomain}`;
};

export const provisionMasumiCrmStaging = async ({
  accountId,
  token,
  hostname = DEFAULT_HOSTNAME,
  adminEmail,
  fetcher = globalThis.fetch
}) => {
  const safeAccountId = normalizeAccountId(accountId);
  const safeHostname = normalizePreviewHostname(hostname);
  const safeEmail = normalizeEmail(adminEmail);

  const application = await ensureAccessApplication({
    accountId: safeAccountId,
    token,
    hostname: safeHostname,
    fetcher
  });
  const policy = await ensureAccessPolicy({
    accountId: safeAccountId,
    token,
    appId: application.app.id,
    adminEmail: safeEmail,
    fetcher
  });
  const issuer = await resolveAccessIssuer({
    accountId: safeAccountId,
    token,
    fetcher
  });

  return {
    hostname: safeHostname,
    applicationId: application.app.id,
    applicationAction: application.action,
    policyAction: policy.action,
    audience: application.app.aud,
    issuer
  };
};

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  provisionMasumiCrmStaging({
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    token: process.env.CLOUDFLARE_API_TOKEN,
    hostname: process.env.CRM_STAGING_HOSTNAME || DEFAULT_HOSTNAME,
    adminEmail: process.env.CRM_PREVIEW_ADMIN_EMAIL
  })
    .then((result) => process.stdout.write(`${JSON.stringify(result)}\n`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
