const { getMembers, setMembers, getChallenges, getFeed, setFeed, checkAuth, sanitize, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, challengeId, score, notes } = JSON.parse(event.body || '{}');
  if (!username || !password || !challengeId || !score) return badReq('Missing fields');

  const members = await getMembers();
  if (!checkAuth(members, username, password)) return unauth();

  const challenges = await getChallenges();
  const challenge = challenges.find(c => c.id === challengeId);
  if (!challenge) return badReq('Challenge not found');

  const u = members[username];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const dateStr = months[now.getMonth()] + ' ' + now.getDate();

  u.logs = u.logs || [];
  u.logs.unshift({ challenge: challenge.title, score, notes: notes || '', date: dateStr });
  u.points = (u.points || 0) + 50;

  await setMembers(members);

  const feed = await getFeed();
  feed.unshift({ name: u.name, action: 'logged score in', target: challenge.title, time: 'Just now' });
  await setFeed(feed);

  return ok({ updatedMember: sanitize(u), updatedFeed: feed.slice(0, 10) });
};
