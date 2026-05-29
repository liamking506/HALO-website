const { getMembers, setMembers, getFeed, setFeed, checkAdmin, sanitize, ok, badReq, unauth } = require('./_data');

// Score formulas matching the Excel spreadsheet exactly
function calcEventScore(ev, t) {
  if (!t) return null;
  switch (ev) {
    case '2400m': { const v=parseFloat(t.run2400); if(!t.run2400||isNaN(v)) return null; return Math.max(0,Math.min(100,(19-v)*(100/12))); }
    case '8km':   { const v=parseFloat(t.run8km);  if(!t.run8km||isNaN(v))  return null; return Math.max(0,Math.min(100,(60-v)*3.125)); }
    case 'swim':  { const v=parseFloat(t.swim2km); if(!t.swim2km||isNaN(v)) return null; return Math.max(0,Math.min(100,(80-v)*(100/55))); }
    case '400m':  { const v=parseFloat(t.run400);  if(!t.run400||isNaN(v))  return null; return Math.max(0,Math.min(100,(100-v)*1.9231)); }
    case 'str1':  { const b=t.bench||0,p=t.pullups||0,s=t.situps||0; if(!b&&!p&&!s) return null; return Math.min(100,(p*1.111)+(b*0.741)+(s*0.37)); }
    case 'str2':  { const p=t.pushups||0,s=t.squats||0; if(!p&&!s) return null; return Math.min(100,(p*0.833)+(s*1.25)); }
    default: return null;
  }
}
function calcTotalPoints(trial) {
  return Math.round(['2400m','8km','swim','400m','str1','str2'].reduce((sum,ev) => sum+(calcEventScore(ev,trial)||0), 0));
}

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

  // Recalculate total points from the new latest trial using proper scoring formulas
  u.points = calcTotalPoints(trial);

  await setMembers(members);

  const feed = await getFeed();
  feed.unshift({ name: 'Admin', action: 'added spot check for', target: u.name, time: 'Just now' });
  await setFeed(feed);

  return ok({ updatedMember: sanitize(u), updatedFeed: feed.slice(0, 10) });
};
