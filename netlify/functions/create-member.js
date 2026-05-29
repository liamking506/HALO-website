const { getMembers, setMembers, getFeed, setFeed, checkAdmin, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, name, newUsername, newPassword, role } = JSON.parse(event.body || '{}');
  if (!username || !password || !name || !newUsername || !newPassword) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');
  if (members[newUsername]) return badReq('Username already exists');

  members[newUsername] = {
    name,
    password: newPassword,
    role: role || 'athlete',
    points: 0,
    mustChangePassword: true,
    bio: '',
    stravaEmbed: '',
    logs: [],
    fitness: { trials: [] },
  };

  await setMembers(members);

  const feed = await getFeed();
  feed.unshift({ name: 'Admin', action: 'added new member', target: name, time: 'Just now' });
  await setFeed(feed);

  return ok({ newMember: sanitize(members[newUsername]), feed: feed.slice(0, 10) });
};
