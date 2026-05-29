const { getChallenges, setChallenges, getFeed, setFeed, checkAdmin, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, action, challenge, challengeId } = JSON.parse(event.body || '{}');
  if (!username || !password || !action) return badReq('Missing fields');

  const { getMembers } = require('./_data');
  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');

  let challenges = await getChallenges();
  const feed = await getFeed();

  if (action === 'create') {
    if (!challenge || !challenge.title) return badReq('Missing challenge data');
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();
    const newChallenge = {
      id: Date.now(),
      title: challenge.title,
      type: challenge.type || 'ATC',
      event: challenge.event || 'none',
      desc: challenge.desc || 'No description.',
      status: challenge.status || 'active',
      month: months[now.getMonth()] + ' ' + now.getFullYear(),
    };
    challenges.unshift(newChallenge);
    feed.unshift({ name: 'Admin', action: 'announced', target: newChallenge.title, time: 'Just now' });
  } else if (action === 'edit') {
    if (!challengeId) return badReq('Missing challengeId');
    if (!challenge || !challenge.title) return badReq('Missing challenge data');
    const idx = challenges.findIndex(c => c.id === challengeId);
    if (idx === -1) return badReq('Challenge not found');
    // Preserve id and month; update the editable fields
    challenges[idx] = {
      ...challenges[idx],
      title: challenge.title,
      type: challenge.type || 'ATC',
      event: challenge.event || 'none',
      desc: challenge.desc || 'No description.',
      status: challenge.status || 'active',
    };
    feed.unshift({ name: 'Admin', action: 'updated', target: challenge.title, time: 'Just now' });
  } else if (action === 'delete') {
    if (!challengeId) return badReq('Missing challengeId');
    challenges = challenges.filter(c => c.id !== challengeId);
  } else {
    return badReq('Unknown action');
  }

  await setChallenges(challenges);
  await setFeed(feed);

  return ok({ challenges, feed: feed.slice(0, 10) });
};
