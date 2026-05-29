const { getMembers, setMembers, checkAuth, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, targetUsername, field, value } = JSON.parse(event.body || '{}');
  if (!username || !password || !targetUsername || !field) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAuth(members, username, password)) return unauth();

  // Must be editing own profile OR be an admin
  const isAdmin = members[username].role === 'admin';
  if (username !== targetUsername && !isAdmin) return unauth('Cannot edit another user\'s profile');
  if (!members[targetUsername]) return badReq('Target user not found');

  const u = members[targetUsername];

  if (field === 'bio') {
    u.bio = value || '';
  } else if (field === 'strava') {
    u.stravaEmbed = value || '';
  } else if (field === 'password') {
    if (!value || value.length < 6) return badReq('Password must be at least 6 characters');
    u.password = value;
    u.mustChangePassword = false;
  } else if (field === 'resetPassword') {
    // Admin-only: set a temp password the member must change on next login
    if (!isAdmin) return unauth('Admin only');
    if (!value || value.length < 6) return badReq('Password must be at least 6 characters');
    u.password = value;
    u.mustChangePassword = true;
  } else {
    return badReq('Unknown field');
  }

  await setMembers(members);
  return ok({ updatedMember: sanitize(u) });
};
