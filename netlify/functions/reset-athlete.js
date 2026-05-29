const { getMembers, setMembers, checkAdmin, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, targetUsername } = JSON.parse(event.body || '{}');
  if (!username || !password || !targetUsername) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');
  if (!members[targetUsername]) return badReq('Target member not found');

  // Wipe performance data; keep login, name, role, bio, strava
  const u = members[targetUsername];
  u.points = 0;
  u.logs = [];
  u.fitness = { trials: [] };

  await setMembers(members);
  return ok({ updatedMember: sanitize(u) });
};
