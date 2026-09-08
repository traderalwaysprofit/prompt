import {
  buildCrmCsv,
  calculateCrmKpis,
  createCrmBackup,
  getActiveFollowUps
} from '../../src/tools/masumi-crm-core.js';
import { CrmApiError, methodNotAllowed } from './errors.js';
import { isoNow } from './lead-api.js';

const API_PREFIX = '/api/crm/v1';
const NO_QUERY_FIELDS = new Set();

const rejectQuery = (url) => {
  for (const field of url.searchParams.keys()) {
    if (!NO_QUERY_FIELDS.has(field)) {
      throw new CrmApiError('UNKNOWN_QUERY_PARAMETER', 422, 'Endpoint ini tidak menerima parameter query.');
    }
  }
};

const requireAdmin = (user) => {
  if (user.role !== 'admin') {
    throw new CrmApiError('ADMIN_REQUIRED', 403, 'Hanya Admin yang dapat mengekspor data CRM.');
  }
};

const REPORTING_SELECT = `
  SELECT
    leads.id, leads.lead_date, leads.source, leads.company, leads.pic_name,
    leads.pic_role, leads.decision_maker_status, leads.contact, leads.city,
    app_users.display_name AS owner_name, leads.brand_status, leads.needs,
    leads.estimated_quantity, leads.potential_value, leads.target_launch,
    leads.pipeline, leads.last_contact, leads.next_action, leads.next_action_date,
    leads.compliance_status, leads.blocker, leads.lost_reason, leads.notes,
    leads.fit_score, leads.readiness_score, leads.urgency_score, leads.value_score,
    leads.created_at, leads.updated_at
  FROM leads
  JOIN app_users ON app_users.id = leads.owner_user_id
  WHERE leads.deleted_at IS NULL
`;

const mapReportingLead = (row) => ({
  id: row.id,
  leadDate: row.lead_date,
  source: row.source,
  company: row.company,
  picName: row.pic_name,
  picRole: row.pic_role,
  decisionMakerStatus: row.decision_maker_status,
  contact: row.contact,
  city: row.city,
  owner: row.owner_name,
  brandStatus: row.brand_status,
  needs: row.needs,
  estimatedQuantity: row.estimated_quantity,
  potentialValue: row.potential_value,
  targetLaunch: row.target_launch,
  pipeline: row.pipeline,
  lastContact: row.last_contact,
  nextAction: row.next_action,
  nextActionDate: row.next_action_date,
  complianceStatus: row.compliance_status,
  blocker: row.blocker,
  lostReason: row.lost_reason,
  notes: row.notes,
  scores: {
    fit: row.fit_score,
    readiness: row.readiness_score,
    urgency: row.urgency_score,
    value: row.value_score
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const loadReportingLeads = async (database, user) => {
  const ownerClause = user.role === 'sales' ? ' AND leads.owner_user_id = ?' : '';
  const parameters = user.role === 'sales' ? [user.id] : [];
  const result = await database.prepare(`
    ${REPORTING_SELECT}${ownerClause}
    ORDER BY leads.updated_at DESC, leads.id ASC
  `).bind(...parameters).all();
  return result.results.map(mapReportingLead);
};

const todayFor = (dependencies = {}) => {
  if (typeof dependencies.today === 'function') return dependencies.today();
  const value = typeof dependencies.now === 'function' ? dependencies.now() : new Date();
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};

const dashboard = async (request, url, user, database, dependencies) => {
  if (request.method !== 'GET') throw methodNotAllowed('GET');
  rejectQuery(url);
  const leads = await loadReportingLeads(database, user);
  const today = todayFor(dependencies);
  return {
    status: 200,
    data: {
      kpis: calculateCrmKpis(leads, today),
      followUps: getActiveFollowUps(leads, today)
    }
  };
};

const downloadHeaders = (contentType, filename) => ({
  'Cache-Control': 'no-store',
  'Content-Disposition': `attachment; filename="${filename}"`,
  'Content-Type': contentType,
  'Referrer-Policy': 'no-referrer',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY'
});

const backupExport = async (request, url, user, database, dependencies) => {
  if (request.method !== 'GET') throw methodNotAllowed('GET');
  rejectQuery(url);
  requireAdmin(user);
  const leads = await loadReportingLeads(database, user);
  const backup = createCrmBackup(leads, isoNow(dependencies));
  return new Response(`${JSON.stringify(backup, null, 2)}\n`, {
    status: 200,
    headers: downloadHeaders('application/json; charset=utf-8', 'masumi-crm-backup.json')
  });
};

const csvExport = async (request, url, user, database) => {
  if (request.method !== 'GET') throw methodNotAllowed('GET');
  rejectQuery(url);
  requireAdmin(user);
  const leads = await loadReportingLeads(database, user);
  return new Response(buildCrmCsv(leads), {
    status: 200,
    headers: downloadHeaders('text/csv; charset=utf-8', 'masumi-crm-leads.csv')
  });
};

export const routeReportingApi = async (request, url, user, env, dependencies = {}) => {
  if (url.pathname === `${API_PREFIX}/dashboard`) {
    return dashboard(request, url, user, env.CRM_DB, dependencies);
  }
  if (url.pathname === `${API_PREFIX}/exports/backup.json`) {
    return backupExport(request, url, user, env.CRM_DB, dependencies);
  }
  if (url.pathname === `${API_PREFIX}/exports/leads.csv`) {
    return csvExport(request, url, user, env.CRM_DB);
  }
  return null;
};
