// Programma, datummodel, opslag en geschiedenis.
// Alles staat in localStorage; er is geen backend.

export const STORE_PREFIX = 'fullbody-week-';
export const DAY_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
export const WEEKDAYS = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
export const WEEKDAYS_SHORT = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

// Rust tussen sets. Compounds krijgen 2.5 min, de rest 60-90 sec.
export const REST_COMPOUND = 150;
export const REST_MID = 90;
export const REST_SMALL = 60;

// Je kunt de rust per oefening bijstellen; dit zijn de stappen.
export const REST_STEPS = [45, 60, 75, 90, 120, 150, 180];

export const SESSION_GOAL = 60 * 60; // 60 minuten

// warm = aantal opwarmsets, work = aantal sets tot falen.
const e = (name, warm, work, rest) => ({ name, warm, work, rest });

export const PROGRAM = {
  A: {
    label: 'Full Body A',
    type: 'lift',
    exercises: [
      e('Bench press', 1, 2, REST_COMPOUND),
      e('Pull ups / lat pulldown', 1, 2, REST_COMPOUND),
      e('Shoulder press', 0, 2, REST_MID),
      e('Leg press', 0, 2, REST_MID),
      e('Hammer curl', 0, 2, REST_SMALL),
      e('Tricep pushdown', 0, 2, REST_SMALL),
      e('Ab-oefening', 0, 2, REST_SMALL),
    ],
  },
  B: { label: 'Hardlopen 10 km', type: 'run', distance: '10' },
  C: {
    label: 'Full Body B',
    type: 'lift',
    exercises: [
      e('Incline bench', 1, 2, REST_COMPOUND),
      e('Rows (cable/barbell)', 1, 2, REST_COMPOUND),
      e('Lateral raises', 0, 2, REST_SMALL),
      e('Lunges / leg extension', 0, 2, REST_MID),
      e('Incline bicep curl', 0, 2, REST_SMALL),
      e('Cable pull over / skullcrusher', 0, 2, REST_SMALL),
      e('Ab-oefening', 0, 2, REST_SMALL),
    ],
  },
  D: { label: 'Rust', type: 'rest' },
  E: {
    label: 'Full Body C',
    type: 'lift',
    exercises: [
      e('Peck deck', 0, 2, REST_MID),
      e('Face pull', 1, 2, REST_COMPOUND),
      e('Shoulder press / lateral raises', 0, 2, REST_MID),
      e('Hamstring curl + calf raises', 0, 2, REST_MID),
      e('Hammer curl', 0, 2, REST_SMALL),
      e('Tricep pushdown', 0, 2, REST_SMALL),
    ],
  },
  F: { label: 'Hardlopen 8 km', type: 'run', distance: '8' },
  G: { label: 'Rust', type: 'rest' },
};

let counter = 0;
export function uid() {
  counter += 1;
  return Date.now().toString(36) + '-' + counter.toString(36) + '-' + Math.random().toString(36).slice(2, 6);
}

/* ---------------- datum / ISO-week ---------------- */

export function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

export function isoWeekInfo(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // donderdag bepaalt het jaar
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

// Dag A valt op maandag, dag G op zondag.
export function dateOfDay(weekKey, dayId) {
  return addDays(mondayOfWeekKey(weekKey), DAY_IDS.indexOf(dayId));
}

export function dayIdOf(date) {
  return DAY_IDS[(date.getDay() + 6) % 7];
}

const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
export function formatShort(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

// 1u 04m voor sessieduur, 48m als het onder het uur blijft.
export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}u ${String(m).padStart(2, '0')}m`;
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

/* ---------------- week aanmaken ---------------- */

export const newSet = (type) => ({ id: uid(), type, kg: '', reps: '', done: false });

export function newExercise(spec) {
  const sets = [];
  for (let i = 0; i < (spec.warm || 0); i += 1) sets.push(newSet('warmup'));
  for (let i = 0; i < (spec.work || 1); i += 1) sets.push(newSet('work'));
  return { id: uid(), name: spec.name, rest: spec.rest || REST_MID, sets };
}

function blankDay(dayId) {
  const p = PROGRAM[dayId];
  const day = {
    id: dayId,
    label: p.label,
    type: p.type,
    done: false,
    session: { seconds: 0, running: false, startedAt: null },
  };
  if (p.type === 'lift') day.exercises = p.exercises.map(newExercise);
  if (p.type === 'run') day.run = { distance: p.distance || '', time: '', note: '' };
  return day;
}

// Een nieuwe week neemt de oefeningen van de vorige week over (die pas je zelf aan),
// maar leeg: gewichten komen uit de geschiedenis, niet uit een kopie.
function dayFromSeed(dayId, seed) {
  if (!seed) return blankDay(dayId);
  const day = blankDay(dayId);
  if (day.type === 'lift' && seed.exercises && seed.exercises.length) {
    day.exercises = seed.exercises.map((ex) => ({
      id: uid(),
      name: ex.name,
      rest: ex.rest || REST_MID,
      sets: (ex.sets || []).map((s) => newSet(s.type || 'work')),
    }));
  }
  if (day.type === 'run' && seed.run) {
    day.run = { distance: seed.run.distance || '', time: '', note: '' };
  }
  return day;
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
    console.warn('Kon week niet opslaan:', err);
  }
}

// Een sessie die nog "loopt" terwijl de app dicht ging, wordt bij het laden
// afgesloten - anders tikt de klok door terwijl je allang thuis bent.
function closeStaleSessions(week) {
  let changed = false;
  DAY_IDS.forEach((id) => {
    const day = week.days[id];
    if (!day || !day.session || !day.session.running) return;
    const started = day.session.startedAt;
    if (started) day.session.seconds += Math.max(0, (Date.now() - started) / 1000);
    day.session.running = false;
    day.session.startedAt = null;
    changed = true;
  });
  return changed;
}

export function loadOrCreateWeek(key) {
  const existing = readWeek(key);
  if (existing) {
    if (closeStaleSessions(existing)) writeWeek(existing);
    return existing;
  }
  // Nieuwe week: pak de laatste week uit de opslag als startpunt (max 8 terug).
  let seed = null;
  let probe = key;
  for (let i = 0; i < 8 && !seed; i += 1) {
    probe = shiftWeekKey(probe, -1);
    seed = readWeek(probe);
  }
  const days = {};
  DAY_IDS.forEach((id) => { days[id] = dayFromSeed(id, seed ? seed.days[id] : null); });
  const week = { key, days };
  writeWeek(week);
  return week;
}

/* ---------------- geschiedenis ---------------- */

export const nameKey = (name) => (name || '').trim().toLowerCase();

// Een set telt mee zodra er gewicht of reps in staan.
const isLogged = (s) => (s.kg !== '' && s.kg != null) || (s.reps !== '' && s.reps != null);

export function num(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// De zwaarste werkset van een oefening: hoogste gewicht, bij gelijk gewicht de meeste reps.
export function topSet(sets) {
  const work = (sets || []).filter((s) => s.type !== 'warmup' && isLogged(s));
  if (!work.length) return null;
  return work.reduce((best, s) => {
    const kg = num(s.kg) ?? 0;
    const reps = num(s.reps) ?? 0;
    const bkg = num(best.kg) ?? 0;
    const breps = num(best.reps) ?? 0;
    if (kg > bkg || (kg === bkg && reps > breps)) return s;
    return best;
  });
}

export function readAllWeeks() {
  const out = [];
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(STORE_PREFIX)) continue;
      const w = readWeek(k.slice(STORE_PREFIX.length));
      if (w) out.push(w);
    }
  } catch (err) {
    console.warn('Kon opslag niet lezen:', err);
  }
  return out.sort((a, b) => (a.key < b.key ? -1 : 1));
}

// naam -> sessies (oplopend in tijd) met de sets van die dag.
export function buildHistory(weeks) {
  const map = new Map();
  weeks.forEach((week) => {
    DAY_IDS.forEach((id) => {
      const day = week.days && week.days[id];
      if (!day || !day.exercises) return;
      const ts = dateOfDay(week.key, id).getTime();
      day.exercises.forEach((ex) => {
        const key = nameKey(ex.name);
        const sets = (ex.sets || []).filter(isLogged).map((s) => ({ type: s.type, kg: s.kg, reps: s.reps }));
        if (!key || !sets.length) return;
        if (!map.has(key)) map.set(key, { name: ex.name.trim(), sessions: [] });
        map.get(key).sessions.push({ ts, sets, top: topSet(sets) });
      });
    });
  });
  map.forEach((entry) => entry.sessions.sort((a, b) => a.ts - b.ts));
  return map;
}

// De laatste sessie vóór `ts`. Zelfde dag telt niet mee, anders kijkt een
// oefening naar zichzelf.
export function findPrevious(history, name, ts) {
  const entry = history.get(nameKey(name));
  if (!entry) return null;
  for (let i = entry.sessions.length - 1; i >= 0; i -= 1) {
    if (entry.sessions[i].ts < ts) return entry.sessions[i];
  }
  return null;
}

/* ---------------- hardloop-geschiedenis ---------------- */

export function runHistory(weeks) {
  const out = [];
  weeks.forEach((week) => {
    DAY_IDS.forEach((id) => {
      const day = week.days && week.days[id];
      if (!day || day.type !== 'run' || !day.run) return;
      const { distance, time, note } = day.run;
      // De afstand staat al ingevuld als planning; pas met een tijd of een vinkje
      // is het een gelopen ronde.
      if (!time && !day.done) return;
      out.push({ ts: dateOfDay(week.key, id).getTime(), label: day.label, distance, time, note });
    });
  });
  return out.sort((a, b) => a.ts - b.ts);
}
