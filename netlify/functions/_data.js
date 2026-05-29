// Shared data helpers — not exposed as an endpoint (underscore prefix)
const { getStore } = require('@netlify/blobs');

const STORE = 'halo-data';

// ── Seed data (used only on first deploy when blobs are empty) ──
const SEED_MEMBERS = {
  admin: { name:'Admin', password:'halo2025', role:'admin', points:0, logs:[], fitness:{trials:[]}, mustChangePassword:false, bio:'' },
  logan: { name:'Logan Stewart', password:'changeme', role:'athlete', points:420, mustChangePassword:true,
    logs:[
      {challenge:'June ATC — 2400m Run', score:'9.75', date:'Jun 1 2025'},
      {challenge:'June ATC — Strength #1', score:'Bench:28, Pull-ups:22, Sit-ups:74', date:'Jun 3 2025'},
    ],
    fitness:{ trials:[
      { date:'Jun 3 2025', run2400:'9.75', run8km:'', swim2km:'', run400:'', sprint40:'', bench:28, pullups:22, situps:74, pushups:48, squats:32 },
      { date:'Apr 1 2025', run2400:'10.10', run8km:'', swim2km:'', run400:'', sprint40:'', bench:25, pullups:19, situps:68, pushups:44, squats:28 },
    ]},
    bio:''  },
  chase: { name:'Chase Hobenshield', password:'changeme', role:'athlete', points:380, mustChangePassword:true,
    logs:[{challenge:'June ATC — 2400m Run', score:'10.20', date:'Jun 1 2025'}],
    fitness:{ trials:[
      { date:'Jun 1 2025', run2400:'10.20', run8km:'', swim2km:'', run400:'', sprint40:'', bench:24, pullups:18, situps:68, pushups:52, squats:28 },
    ]},
    bio:''  },
  max: { name:'Max Hooper', password:'changeme', role:'athlete', points:310, mustChangePassword:true,
    logs:[],
    fitness:{ trials:[
      { date:'Jun 1 2025', run2400:'', run8km:'', swim2km:'', run400:'', sprint40:'', bench:20, pullups:15, situps:60, pushups:44, squats:25 },
    ]},
    bio:''  },
  stephanie: { name:'Stephanie Sinclair', password:'changeme', role:'athlete', points:290, mustChangePassword:true, logs:[], fitness:{trials:[]}, bio:'' },
  nathan:    { name:'Nathan James Stewart', password:'theseedofmars', role:'athlete', points:260, mustChangePassword:true, logs:[], fitness:{trials:[]}, bio:'' },
  francois:  { name:'François Jeraj', password:'changeme', role:'athlete', points:240, mustChangePassword:true, logs:[], fitness:{trials:[]}, bio:'' },
  marcus:    { name:'Marcus Cheng', password:'changeme', role:'athlete', points:210, mustChangePassword:true, logs:[], fitness:{trials:[]}, bio:'' },
};

const SEED_CHALLENGES = [
  { id:1, title:'June ATC — 2400m Run', type:'ATC', event:'2400m', desc:'Timed 2400m run. Submit decimal time. All-out effort.', status:'active', month:'June 2025' },
  { id:2, title:'June ATC — Strength #1', type:'ATC', event:'strength1', desc:'Max reps: Bench Press (0.7× BW), Pull-Ups, Sit-Ups. Enter reps individually.', status:'active', month:'June 2025' },
  { id:3, title:'July ATC — Swim 2km', type:'ATC', event:'swim', desc:'Timed 2km swim. Submit decimal time.', status:'upcoming', month:'July 2025' },
  { id:4, title:'May ATC — 8km Run', type:'ATC', event:'8km', desc:'Timed 8km run. Submit decimal time.', status:'completed', month:'May 2025' },
];

const SEED_FEED = [
  { name:'Logan Stewart', action:'logged score in', target:'June ATC — 2400m Run', time:'2 days ago' },
  { name:'Chase Hobenshield', action:'logged score in', target:'June ATC — 2400m Run', time:'2 days ago' },
  { name:'Admin', action:'announced', target:'July ATC — Swim 2km', time:'1 week ago' },
];

const SEED_SETTINGS = {
  philosophyText: "Human Analogue Labs uses Analogue Training Challenges (ATCs) and bimonthly spot checks to measure raw, functional fitness across all energy systems — aerobic capacity, anaerobic power, and strength. These benchmarks are designed to reflect real-world performance demands, not gym metrics. The spot checks provide longitudinal data to track each athlete's development over time, while ATCs create competitive pressure that drives adaptation. Together, they form the foundation of the HALO fitness standard."
};

// ── Store accessors ──
// Netlify normally injects Blobs credentials automatically. When it doesn't
// (MissingBlobsEnvironmentError), fall back to manual config via env vars.
function ds() {
  const siteID = process.env.HALO_BLOBS_SITE_ID;
  const token = process.env.HALO_BLOBS_TOKEN;
  if (siteID && token) return getStore({ name: STORE, siteID, token });
  return getStore(STORE);
}

async function getMembers() {
  const v = await ds().get('members', { type: 'json' });
  if (!v) { await ds().set('members', JSON.stringify(SEED_MEMBERS)); return SEED_MEMBERS; }
  return v;
}
async function setMembers(m) { await ds().set('members', JSON.stringify(m)); }

async function getChallenges() {
  const v = await ds().get('challenges', { type: 'json' });
  if (!v) { await ds().set('challenges', JSON.stringify(SEED_CHALLENGES)); return SEED_CHALLENGES; }
  return v;
}
async function setChallenges(c) { await ds().set('challenges', JSON.stringify(c)); }

async function getFeed() {
  const v = await ds().get('feed', { type: 'json' });
  if (!v) { await ds().set('feed', JSON.stringify(SEED_FEED)); return SEED_FEED; }
  return v;
}
async function setFeed(f) { await ds().set('feed', JSON.stringify(f.slice(0, 20))); }

async function getSettings() {
  const v = await ds().get('settings', { type: 'json' });
  if (!v) { await ds().set('settings', JSON.stringify(SEED_SETTINGS)); return SEED_SETTINGS; }
  return v;
}
async function setSettings(s) { await ds().set('settings', JSON.stringify(s)); }

// ── Auth helpers ──
function checkAuth(members, username, password) {
  const u = members[username];
  return u && u.password === password;
}
function checkAdmin(members, username, password) {
  const u = members[username];
  return u && u.password === password && u.role === 'admin';
}

// Strip password before sending to client
function sanitize(user) {
  const { password, ...safe } = user;
  return safe;
}
function sanitizeAll(members) {
  const out = {};
  for (const [k, v] of Object.entries(members)) out[k] = sanitize(v);
  return out;
}

// ── Response helpers ──
const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
function ok(body)        { return { statusCode: 200, headers: CORS, body: JSON.stringify(body) }; }
function badReq(msg)     { return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: msg }) }; }
function unauth(msg='Unauthorized') { return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: msg }) }; }

module.exports = { getMembers, setMembers, getChallenges, setChallenges, getFeed, setFeed, getSettings, setSettings, checkAuth, checkAdmin, sanitize, sanitizeAll, ok, badReq, unauth };
