import { CrmApiError, methodNotAllowed } from './errors.js';

export const listAssignableUsers = async (request, user, database) => {
  if (request.method !== 'GET') throw methodNotAllowed('GET');
  if (new URL(request.url).search) {
    throw new CrmApiError('UNKNOWN_QUERY_PARAMETER', 422, 'Endpoint user tidak menerima parameter query.');
  }

  if (user.role === 'sales') {
    return {
      status: 200,
      data: [{ id: user.id, displayName: user.displayName, role: user.role }]
    };
  }

  const result = await database.prepare(`
    SELECT id, display_name, role
    FROM app_users
    WHERE active = 1
    ORDER BY display_name COLLATE NOCASE, id
  `).all();

  return {
    status: 200,
    data: result.results.map((row) => ({
      id: row.id,
      displayName: row.display_name,
      role: row.role
    }))
  };
};
