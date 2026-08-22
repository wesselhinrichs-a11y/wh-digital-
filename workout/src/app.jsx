import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import {
  DAY_KEYS, DAY_NAMES, DAY_ABBR,
  uid, emptySet, newExercise, newRun,
  addDays, weekKeyOf, mondayOfWeekKey, shiftWeekKey, dateOfDay,
  formatShort, sameDay, isoWeekInfo,
  loadOrCreateWeek, writeWeek, computeStreak,
  readPastWeeks, buildHistory, findPrevious,
} from './data.js';

/* ---------------- kleine bouwstenen ---------------- */

function Check({ checked, onChange, size = 'sm', label }) {
  return (
    <button
      type="button"
      className={`check check--${size} ${checked ? 'is-on' : ''}`}
      aria-pressed={checked}
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.6l5.2 5.2L20 7" /></svg>
    </button>
  );
}

function NumField({ value, placeholder, onChange, suffix, ariaLabel }) {
  return (
    <span className="numfield">
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={value}
        placeholder={placeholder || '–'}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value.replace(',', '.'))}
        onFocus={(e) => e.target.select()}
      />
      {suffix ? <span className="numfield__suffix">{suffix}</span> : null}
    </span>
  );
}

/* ---------------- oefening ---------------- */

function setSummary(s) {
  if (s.reps && s.kg) return `${s.reps} × ${s.kg} kg`;
  if (s.reps) return `${s.reps} reps`;
  return `${s.kg} kg`;
}

// `update` neemt altijd een functie (huidige waarde -> nieuwe waarde), zodat twee
// wijzigingen vlak na elkaar niet op dezelfde verouderde props stapelen.
function Exercise({ exercise, update, remove, previous }) {
  const { name, sets, done } = exercise;

  const setSets = (fn) => update((ex) => ({ ...ex, sets: fn(ex.sets) }));

  const patchSet = (id, patch) => setSets((arr) => arr.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addSet = () => setSets((arr) => {
    const last = arr[arr.length - 1];
    return [...arr, last ? { ...last, id: uid() } : emptySet()];
  });

  return (
    <div className={`ex ${done ? 'is-done' : ''}`}>
      <div className="ex__head">
        <Check checked={done} onChange={(v) => update((ex) => ({ ...ex, done: v }))} label={`${name} afvinken`} />
        <input
          className="ex__name"
          value={name}
          placeholder="Oefening"
          aria-label="Naam oefening"
          onChange={(e) => { const v = e.target.value; update((ex) => ({ ...ex, name: v })); }}
        />
        <button type="button" className="iconbtn" aria-label="Oefening verwijderen" onClick={remove}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>

      {previous ? (
        <p className="ex__prev">
          <span className="ex__prev-label">vorige keer · {formatShort(new Date(previous.ts))}</span>
          <span className="ex__prev-sets">{previous.sets.map(setSummary).join(' · ')}</span>
        </p>
      ) : null}

      <div className="sets">
        {sets.map((s, i) => {
          const ref = previous ? previous.sets[i] : null;
          return (
          <div className="setrow" key={s.id}>
            <span className="setrow__idx">{i + 1}</span>
            <NumField
              value={s.reps}
              placeholder={ref ? ref.reps : '–'}
              ariaLabel={`Set ${i + 1} reps`}
              onChange={(v) => patchSet(s.id, { reps: v })}
            />
            <span className="setrow__x">×</span>
            <NumField
              value={s.kg}
              placeholder={ref ? ref.kg : '–'}
              suffix="kg"
              ariaLabel={`Set ${i + 1} gewicht`}
              onChange={(v) => patchSet(s.id, { kg: v })}
            />
            <button
              type="button"
              className="iconbtn iconbtn--ghost"
              aria-label={`Set ${i + 1} verwijderen`}
              onClick={() => setSets((arr) => arr.filter((x) => x.id !== s.id))}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12" /></svg>
            </button>
          </div>
          );
        })}
      </div>

      <button type="button" className="addbtn addbtn--sub" onClick={addSet}>+ set toevoegen</button>
    </div>
  );
}

/* ---------------- hardloop-blok ---------------- */

function RunBlock({ item, update, remove }) {
  return (
    <div className={`run ${item.done ? 'is-done' : ''}`}>
      <div className="run__head">
        <Check
          checked={!!item.done}
          onChange={(v) => update((r) => ({ ...r, done: v }))}
          label="Hardlopen afvinken"
        />
        <span className="run__label">
          <svg viewBox="0 0 24 24" className="run__icon" aria-hidden="true">
            <path d="M13 4.5a1.6 1.6 0 100-.1M8 20l2.5-4 3-2-1-4.5 3.5 2 2.5.5M6.5 12l2-3.5 4-1.5" />
          </svg>
          Hardlopen
        </span>
        <button type="button" className="iconbtn" aria-label="Hardloop-blok verwijderen" onClick={remove}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="run__grid">
        <label className="field">
          <span className="field__label">Afstand</span>
          <NumField
            value={item.distance}
            suffix="km"
            ariaLabel="Afstand in kilometer"
            onChange={(v) => update((r) => ({ ...r, distance: v }))}
          />
        </label>
        <label className="field">
          <span className="field__label">Tijd</span>
          <span className="numfield">
            <input
              type="text"
              inputMode="numeric"
              value={item.time}
              placeholder="48:30"
              aria-label="Tijd"
              onChange={(e) => { const v = e.target.value; update((r) => ({ ...r, time: v })); }}
              onFocus={(e) => e.target.select()}
            />
          </span>
        </label>
      </div>
      <label className="field">
        <span className="field__label">Notitie</span>
        <input
          className="notefield"
          type="text"
          value={item.note}
          placeholder="Hoe voelde het?"
          aria-label="Notitie"
          onChange={(e) => { const v = e.target.value; update((r) => ({ ...r, note: v })); }}
        />
      </label>
    </div>
  );
}

/* ---------------- dag ---------------- */

// Alles van deze dag afgevinkt? Een dag zonder onderdelen (rustdag) telt niet mee.
function allItemsDone(day) {
  const items = [...(day.exercises || []), ...(day.runs || [])];
  return items.length > 0 && items.every((i) => i.done);
}

// De dag vinkt zichzelf af zodra het laatste onderdeel af is, en weer uit zodra
// je iets uitvinkt. Een handmatig afgevinkte dag blijft met rust.
function syncDayDone(before, after) {
  if (allItemsDone(after)) return after.done ? after : { ...after, done: true };
  if (after.done && allItemsDone(before)) return { ...after, done: false };
  return after;
}

function DayCard({ dayKey, day, date, isToday, open, onToggleOpen, update, previousFor }) {
  const setDay = (patch) => update((d) => ({ ...d, ...patch }));

  // Wijzigingen aan onderdelen lopen hierlangs, zodat de dagstatus meebeweegt.
  const updateItems = (fn) => update((d) => syncDayDone(d, fn(d)));

  const updateExercise = (id, fn) => updateItems((d) => ({ ...d, exercises: d.exercises.map((e) => (e.id === id ? fn(e) : e)) }));
  const removeExercise = (id) => updateItems((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id) }));
  const addExercise = () => updateItems((d) => ({ ...d, exercises: [...d.exercises, newExercise()] }));

  const updateRun = (id, fn) => updateItems((d) => ({ ...d, runs: d.runs.map((r) => (r.id === id ? fn(r) : r)) }));
  const removeRun = (id) => updateItems((d) => ({ ...d, runs: d.runs.filter((r) => r.id !== id) }));
  const addRun = () => updateItems((d) => ({ ...d, runs: [...d.runs, newRun()] }));

  const items = [...day.exercises, ...day.runs];
  const doneItems = items.filter((i) => i.done).length;

  return (
    <section className={`day ${day.done ? 'is-done' : ''} ${isToday ? 'is-today' : ''} ${open ? 'is-open' : ''}`}>
      <div className="day__head" onClick={onToggleOpen} role="button" tabIndex={0}
        aria-expanded={open}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleOpen(); } }}
      >
        <span className="day__abbr">{DAY_ABBR[dayKey]}</span>
        <span className="day__info">
          <strong className="day__name">
            {DAY_NAMES[dayKey]}
            {isToday ? <em className="badge">vandaag</em> : null}
          </strong>
          <span className="day__title">{day.title}</span>
        </span>
        <span className="day__meta">
          <span className="day__date">{formatShort(date)}</span>
          {items.length > 0 ? <span className="day__count">{doneItems}/{items.length}</span> : null}
        </span>
        <Check size="lg" checked={day.done} onChange={(v) => setDay({ done: v })} label={`${DAY_NAMES[dayKey]} als gedaan markeren`} />
      </div>

      {open ? (
        <div className="day__body">
          {day.type === 'rest' ? (
            <div className="rest">
              <p className="rest__text">Rustdag. Niks moeten.</p>
              <button
                type="button"
                className={`chip ${day.sauna ? 'is-on' : ''}`}
                aria-pressed={!!day.sauna}
                onClick={() => setDay({ sauna: !day.sauna })}
              >
                Sauna
              </button>
            </div>
          ) : null}

          {day.exercises.map((e) => (
            <Exercise
              key={e.id}
              exercise={e}
              update={(fn) => updateExercise(e.id, fn)}
              remove={() => removeExercise(e.id)}
              previous={previousFor(e.name)}
            />
          ))}

          {day.runs.map((r) => (
            <RunBlock
              key={r.id}
              item={r}
              update={(fn) => updateRun(r.id, fn)}
              remove={() => removeRun(r.id)}
            />
          ))}

          <div className="day__actions">
            <button type="button" className="addbtn" onClick={addExercise}>+ oefening</button>
            <button type="button" className="addbtn" onClick={addRun}>+ hardlopen</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------------- app ---------------- */

function App() {
  const [today, setToday] = useState(() => new Date());
  const todayKey = weekKeyOf(today);

  // Eén bron van waarheid: het weekobject draagt zijn eigen key. Navigeren laadt
  // meteen (niet via een effect), zodat header en data nooit uit de pas lopen.
  const [week, setWeek] = useState(() => loadOrCreateWeek(todayKey));
  const [openDay, setOpenDay] = useState(() => DAY_KEYS[(today.getDay() + 6) % 7]);
  const [streak, setStreak] = useState(0);

  const weekKey = week.key;
  const goToWeek = useCallback((key) => setWeek(loadOrCreateWeek(key)), []);

  // Opslaan bij elke wijziging (onder de key van de week zelf, nooit een stale key).
  useEffect(() => {
    if (week && week.key) writeWeek(week);
  }, [week]);

  // Streak herberekenen na elke wijziging.
  useEffect(() => { setStreak(computeStreak(today)); }, [week, today]);

  // Rond middernacht / bij terugkeer naar de app: nieuwe dag detecteren.
  useEffect(() => {
    const check = () => {
      const now = new Date();
      if (!sameDay(now, today)) {
        const wasOnCurrentWeek = week.key === weekKeyOf(today);
        setToday(now);
        // Kijk je naar de lopende week, dan schuif je maandag automatisch mee
        // naar de nieuwe (lege) week. Sta je in het archief, dan blijf je daar.
        if (wasOnCurrentWeek && weekKeyOf(now) !== week.key) goToWeek(weekKeyOf(now));
      }
    };
    const timer = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', check); };
  }, [today, week.key, goToWeek]);

  // Historie voor "vorige keer". De opgeslagen weken worden alleen bij het wisselen
  // van week uit localStorage gelezen; de week waar je in zit komt uit de state,
  // zodat wat je nu typt meteen als referentie geldt voor een latere dag.
  const pastWeeks = useMemo(() => readPastWeeks(weekKey, 10), [weekKey]);
  const history = useMemo(() => buildHistory([...pastWeeks, week]), [pastWeeks, week]);

  const monday = useMemo(() => mondayOfWeekKey(weekKey), [weekKey]);
  const sunday = useMemo(() => addDays(monday, 6), [monday]);
  const { week: weekNr } = isoWeekInfo(monday);
  const isCurrentWeek = weekKey === todayKey;

  const updateDay = useCallback((dayKey, fn) => {
    setWeek((w) => ({ ...w, days: { ...w.days, [dayKey]: fn(w.days[dayKey]) } }));
  }, []);

  const doneCount = week ? DAY_KEYS.filter((d) => week.days[d].done).length : 0;

  if (!week) return null;

  return (
    <div className="app">
      <header className="topbar">
        <button type="button" className="navbtn" aria-label="Vorige week" onClick={() => goToWeek(shiftWeekKey(weekKey, -1))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <div className="topbar__center">
          <h1 className="topbar__week">Week {weekNr}</h1>
          <p className="topbar__range">{formatShort(monday)} – {formatShort(sunday)}</p>
        </div>
        <button type="button" className="navbtn" aria-label="Volgende week" onClick={() => goToWeek(shiftWeekKey(weekKey, 1))}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </header>

      <div className="stats">
        <div className="stat stat--streak">
          <span className="stat__value">{streak}</span>
          <span className="stat__label">dagen streak</span>
        </div>
        <div className="stat">
          <span className="stat__value">{doneCount}<span className="stat__of">/7</span></span>
          <span className="stat__label">deze week gedaan</span>
        </div>
      </div>

      {!isCurrentWeek ? (
        <button type="button" className="todaybtn" onClick={() => goToWeek(todayKey)}>↩ Terug naar deze week</button>
      ) : null}

      <main className="days">
        {DAY_KEYS.map((dk) => {
          const date = dateOfDay(weekKey, dk);
          return (
            <DayCard
              key={dk}
              dayKey={dk}
              day={week.days[dk]}
              date={date}
              isToday={isCurrentWeek && sameDay(date, today)}
              open={openDay === dk}
              onToggleOpen={() => setOpenDay((cur) => (cur === dk ? null : dk))}
              update={(fn) => updateDay(dk, fn)}
              previousFor={(name) => findPrevious(history, name, date.getTime())}
            />
          );
        })}
      </main>

      <footer className="foot">Alles staat lokaal op dit toestel · {week.key}</footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
