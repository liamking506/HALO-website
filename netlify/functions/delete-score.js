const { getMembers, setMembers, checkAdmin, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, targetUsername, type, index } = JSON.parse(event.body || '{}');
  if (!username || !password || !targetUsername || !type || index === undefined || index === null) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');
  if (!members[targetUsername]) return badReq('Target member not found');

  const u = members[targetUsername];
  const i = parseInt(index, 10);

  if (type === 'log') {
    if (!Array.isArray(u.logs) || i < 0 || i >= u.logs.length) return badReq('Log not found');
    u.logs.splice(i, 1);
    u.points = Math.max(0, (u.points || 0) - 50); // undo the points that score awarded
  } else if (type === 'trial') {
    if (!u.fitness || !Array.isArray(u.fitness.trials) || i < 0 || i >= u.fitness.trials.length) return badReq('Trial not found');
    u.fitness.trials.splice(i, 1);
  } else {
    return badReq('Unknown type');
  }

  await setMembers(members);
  return ok({ updatedMember: sanitize(u) });
};
