// Datamodel, week-berekening en localStorage-laag.

export const STORE_PREFIX = 'workout-week-';
export const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const DAY_NAMES = {
  mon: 'Maandag',
  tue: 'Dinsdag',
  wed: 'Woensdag',
  thu: 'Donderdag',
  fri: 'Vrijdag',
  sat: 'Zaterdag',
  sun: 'Zondag',
};

export const DAY_ABBR = {
  mon: 'MA', tue: 'DI', wed: 'WO', thu: 'DO', fri: 'VR', sat: 'ZA', sun: 'ZO',
};

export const DEFAULT_SETS = 3;

export const emptySet = () => ({ id: uid(), reps: '', kg: '' });

export const newExercise = (name = '', sets = DEFAULT_SETS) => ({
  id: uid(),
  name,
  done: false,
  sets: Array.from({ length: sets }, emptySet),
});

export const newRun = (distance = '') => ({ id: uid(), distance, time: '', note: '', done: false });

const ex = newExercise;
const run = newRun;

// Vaste split. Oefeningen zijn startpunten - je past ze zelf aan.
export const TEMPLATE = {
  mon: {
    title: 'Borst · Tricep · Schouder',
    type: 'lift',
    exercises: () => [
      ex('Bench press'),
      ex('Incline dumbbell press'),
      ex('Cable fly'),
      ex('Schouderpress'),
      ex('Lateral raise'),
      ex('Tricep pushdown'),
    ],
    runs: () => [],
  },
  tue: {
    title: 'Rug · Bicep',
    type: 'lift',
    exercises: () => [
      ex('Pull-ups'),
      ex('Barbell row'),
      ex('Lat pulldown'),
      ex('Face pull'),
      ex('Barbell curl'),
      ex('Hammer curl'),
    ],
    runs: () => [],
  },
  wed: {
    title: 'Hardlopen 10 km',
    type: 'run',
    exercises: () => [],
    runs: () => [run('10')],
  },
  thu: {
    title: 'Rust',
    type: 'rest',
    exercises: () => [],
    runs: () => [],
  },
  fri: {
    title: 'Armen + Hardlopen 8 km (avond)',
    type: 'both',
    exercises: () => [
      ex('Barbell curl'),
      ex('Hammer curl'),
      ex('Skull crushers'),
      ex('Tricep pushdown'),
    ],
    runs: () => [run('8')],
  },
  sat: {
    title: 'Borst · Rug',
    type: 'lift',
    exercises: () => [
      ex('Bench press'),
      ex('Chest press machine'),
      ex('Barbell row'),
      ex('Lat pulldown'),
      ex('Cable fly'),
      ex('Seated row'),
    ],
    runs: () => [],
  },
  sun: {
    title: 'Benen',
    type: 'lift',
    exercises: () => [
      ex('Squat'),
      ex('Romanian deadlift'),
      ex('Leg press'),
      ex('Leg curl'),
      ex('Leg extension'),
      ex('Calf raise'),
    ],
    runs: () => [],
  },
};

let counter = 0;
export function uid() {
  counter += 1;
  return Date.now().toString(36) + '-' + counter.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/* ---------- datum / ISO-week ---------- */

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isoWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // donderdag van deze week bepaalt het jaar
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKeyOf(date) {
  const { year, week } = isoWeekInfo(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function mondayOfWeekKey(key) {
  const [year, week] = key.split('-W').map(Number);
  const jan4 = new Date(year, 0, 4);
  const dayNum = jan4.getDay() || 7;
  const mondayWeek1 = addDays(jan4, 1 - dayNum);
  return addDays(mondayWeek1, (week - 1) * 7);
}

export function shiftWeekKey(key, delta) {
  return weekKeyOf(addDays(mondayOfWeekKey(key), delta * 7));
}

export function dayKeyOf(date) {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

export function dateOfDay(weekKey, dayKey) {
  return addDays(mondayOfWeekKey(weekKey), DAY_KEYS.indexOf(dayKey));
}

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export function formatShort(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/* ---------- week aanmaken ---------- */

function blankDay(dayKey) {
  const t = TEMPLATE[dayKey];
  return {
    title: t.title,
    type: t.type,
    done: false,
    sauna: false,
    exercises: t.exercises(),
    runs: t.runs(),
  };
}

// Nieuwe week neemt de oefeningen van de vorige week over (die pas je immers aan),
// maar leeg. De vorige waarden komen uit de historie (zie findPrevious).
function dayFromSeed(dayKey, seedDay) {
  if (!seedDay) return blankDay(dayKey);
  return {
    title: seedDay.title || TEMPLATE[dayKey].title,
    type: seedDay.type || TEMPLATE[dayKey].type,
    done: false,
    sauna: false,
    exercises: (seedDay.exercises || []).map((e) => ({
      id: uid(),
      name: e.name,
      done: false,
      sets: Array.from({ length: Math.max(e.sets ? e.sets.length : 0, 1) }, emptySet),
    })),
    runs: (seedDay.runs || []).map((r) => newRun(r.distance || '')),
  };
}

export function readWeek(key) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.days) return null;
    return parsed;
  } catch (err) {
    console.warn('Kon week niet lezen:', key, err);
    return null;
  }
}

export function writeWeek(week) {
  try {
    localStorage.setItem(STORE_PREFIX + week.key, JSON.stringify(week));
  } catch (err) {
    console.warn('Kon week niet opslaan:', week.key, err);
  }
}

// Meest recente opgeslagen week vóór `key` (max 8 weken terug kijken).
function findSeed(key) {
  let probe = key;
  for (let i = 0; i < 8; i += 1) {
    probe = shiftWeekKey(probe, -1);
    const w = readWeek(probe);
    if (w) return w;
  }
  return null;
}

export function loadOrCreateWeek(key) {
  const existing = readWeek(key);
  if (existing) return existing;
  const seed = findSeed(key);
  const days = {};
  DAY_KEYS.forEach((dk) => {
    days[dk] = seed ? dayFromSeed(dk, seed.days[dk]) : blankDay(dk);
  });
  return { key, days };
}

/* ---------- historie: "vorige keer" per oefening ---------- */

const normalizeName = (name) => (name || '').trim().toLowerCase();

// Een set telt alleen mee als er iets is ingevuld - anders is het geen sessie.
function loggedSets(exercise) {
  return (exercise.sets || [])
    .filter((s) => (s.reps !== '' && s.reps != null) || (s.kg !== '' && s.kg != null))
    .map((s) => ({ reps: s.reps || '', kg: s.kg || '' }));
}

// Alle ingevulde oefensessies uit één week, met de datum waarop ze vielen.
export function sessionsFromWeek(week) {
  const out = [];
  if (!week || !week.days || !week.key) return out;
  DAY_KEYS.forEach((dayKey) => {
    const day = week.days[dayKey];
    if (!day || !day.exercises) return;
    const ts = dateOfDay(week.key, dayKey).getTime();
    day.exercises.forEach((e) => {
      const name = normalizeName(e.name);
      const sets = loggedSets(e);
      if (name && sets.length) out.push({ name, ts, sets });
    });
  });
  return out;
}

// De opgeslagen weken vóór `weekKey` (de huidige week voegt de app zelf toe,
// zodat wijzigingen die je nu typt meteen meetellen).
export function readPastWeeks(weekKey, back = 10) {
  const out = [];
  let probe = weekKey;
  for (let i = 0; i < back; i += 1) {
    probe = shiftWeekKey(probe, -1);
    const w = readWeek(probe);
    if (w) out.push(w);
  }
  return out;
}

// naam -> sessies, nieuwste eerst.
export function buildHistory(weeks) {
  const map = new Map();
  weeks.forEach((w) => {
    sessionsFromWeek(w).forEach((s) => {
      if (!map.has(s.name)) map.set(s.name, []);
      map.get(s.name).push(s);
    });
  });
  map.forEach((list) => list.sort((a, b) => b.ts - a.ts));
  return map;
}

// Laatste sessie van deze oefening vóór `ts`. Sessies op dezelfde dag tellen niet
// mee, anders verwijst een oefening naar zichzelf.
export function findPrevious(history, name, ts) {
  const list = history.get(normalizeName(name));
  if (!list) return null;
  return list.find((s) => s.ts < ts) || null;
}

/* ---------- streak ---------- */

// Aaneengesloten dagen met een afgevinkte training, terugtellend vanaf vandaag.
// Rustdagen breken de streak niet. Vandaag telt nog niet als "gemist".
export function computeStreak(today = new Date()) {
  const cache = new Map();
  const getWeek = (key) => {
    if (!cache.has(key)) cache.set(key, readWeek(key));
    return cache.get(key);
  };

  let streak = 0;
  let cursor = new Date(today);
  let isToday = true;

  for (let i = 0; i < 370; i += 1) {
    const week = getWeek(weekKeyOf(cursor));
    const dk = dayKeyOf(cursor);
    const day = week && week.days ? week.days[dk] : null;
    const type = day ? day.type : TEMPLATE[dk].type;

    if (day && day.done) {
      streak += 1;
    } else if (type === 'rest') {
      // rustdag: slaat over, breekt niet
    } else if (isToday) {
      // de dag is nog niet voorbij
    } else {
      break;
    }

    isToday = false;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
