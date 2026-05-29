const { getMembers, checkAuth, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password } = JSON.parse(event.body || '{}');
  if (!username || !password) return badReq('Missing credentials');

  const members = await getMembers();
  if (!checkAuth(members, username, password)) return unauth('Incorrect username or password.');

  return ok({ success: true, role: members[username].role });
};
