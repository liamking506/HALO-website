const { getMembers, setMembers, getFeed, setFeed, checkAdmin, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, targetUsername, trial } = JSON.parse(event.body || '{}');
  if (!username || !password || !targetUsername || !trial) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');
  if (!members[targetUsername]) return badReq('Target member not found');

  const u = members[targetUsername];
  if (!u.fitness) u.fitness = { trials: [] };
  if (!u.fitness.trials) u.fitness.trials = [];
  u.fitness.trials.unshift(trial);

  await setMembers(members);

  const feed = await getFeed();
  feed.unshift({ name: 'Admin', action: 'added spot check for', target: u.name, time: 'Just now' });
  await setFeed(feed);

  return ok({ updatedMember: sanitize(u), updatedFeed: feed.slice(0, 10) });
};
