const { getMembers, getSettings, setSettings, checkAdmin, ok, badReq, unauth } = require('./_data');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return badReq('POST only');
  const { username, password, philosophyText } = JSON.parse(event.body || '{}');
  if (!username || !password) return badReq('Missing credentials');

  const members = await getMembers();
  if (!checkAdmin(members, username, password)) return unauth('Admin only');

  const settings = await getSettings();
  settings.philosophyText = philosophyText || settings.philosophyText;
  await setSettings(settings);

  return ok({ success: true });
};
