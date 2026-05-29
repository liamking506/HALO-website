const { getMembers, getChallenges, getFeed, getSettings, sanitizeAll, ok } = require('./_data');

exports.handler = async () => {
  const [members, challenges, feed, settings] = await Promise.all([
    getMembers(), getChallenges(), getFeed(), getSettings()
  ]);
  return ok({
    members: sanitizeAll(members),
    challenges,
    feed,
    philosophyText: settings.philosophyText || '',
  });
};
