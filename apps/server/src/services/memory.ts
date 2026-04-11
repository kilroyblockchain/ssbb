import fs from 'fs';
import path from 'path';

export type MemoryFact = { text: string; source: string; createdAt: string };
export type PersonaMemory = {
  profile: { displayName?: string; persona?: string; favoriteColor?: string; lastUpdated?: string };
  facts: MemoryFact[];
  moodBoard: string[];
};

export type ProjectMemory = {
  episodeFocus: string;
  runningGags: string[];
  openThreads: string[];
  timeline?: Array<{ title: string; notes: string; createdAt: string }>;
};

const ROOT = path.join(process.cwd(), 'data', 'memory');
const USERS_DIR = path.join(ROOT, 'users');
const PROJECT_FILE = path.join(ROOT, 'project.json');

function ensureDirs() {
  if (!fs.existsSync(ROOT)) fs.mkdirSync(ROOT, { recursive: true });
  if (!fs.existsSync(USERS_DIR)) fs.mkdirSync(USERS_DIR, { recursive: true });
  if (!fs.existsSync(PROJECT_FILE)) {
    fs.writeFileSync(
      PROJECT_FILE,
      JSON.stringify(
        {
          episodeFocus: 'Episode 0 — Pink Noise Dress Rehearsal',
          runningGags: ['Dumpster fire roadtrip', 'Neon slime power color'],
          openThreads: ['Wire Bedrock chat loop', 'Build SSBB-native canvas applet'],
          timeline: []
        },
        null,
        2
      )
    );
  }
}

ensureDirs();

function userPath(email: string) {
  const safe = email.replace(/[^a-z0-9@._-]/gi, '_').toLowerCase();
  return path.join(USERS_DIR, `${safe}.json`);
}

export function getUserMemory(email: string): PersonaMemory {
  const file = userPath(email);
  if (!fs.existsSync(file)) {
    const seed: PersonaMemory = {
      profile: {
        displayName: email.split('@')[0],
        lastUpdated: new Date().toISOString()
      },
      facts: [],
      moodBoard: []
    };
    fs.writeFileSync(file, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(file, 'utf8')) as PersonaMemory;
}

export function rememberUserFact(email: string, text: string, source: string) {
  const current = getUserMemory(email);
  current.facts.push({ text, source, createdAt: new Date().toISOString() });
  current.profile.lastUpdated = new Date().toISOString();
  fs.writeFileSync(userPath(email), JSON.stringify(current, null, 2));
  return current;
}

export function getProjectMemory(): ProjectMemory {
  return JSON.parse(fs.readFileSync(PROJECT_FILE, 'utf8')) as ProjectMemory;
}

export function rememberProjectFact(text: string, source: string) {
  const data = getProjectMemory();
  data.openThreads = Array.from(new Set([text, ...data.openThreads]));
  data.timeline = data.timeline || [];
  data.timeline.push({ title: text.slice(0, 80), notes: `Source: ${source}`, createdAt: new Date().toISOString() });
  fs.writeFileSync(PROJECT_FILE, JSON.stringify(data, null, 2));
  return data;
}
