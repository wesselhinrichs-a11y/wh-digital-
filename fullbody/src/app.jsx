import { useState, useEffect, useMemo, useRef, useCallback, useId } from 'react';
import { createRoot } from 'react-dom/client';

import {
  DAY_IDS, WEEKDAYS, WEEKDAYS_SHORT, PROGRAM, REST_STEPS, SESSION_GOAL,
  uid, newSet, newExercise,
  weekKeyOf, shiftWeekKey, mondayOfWeekKey, dateOfDay, dayIdOf, addDays,
  formatShort, sameDay, formatClock, formatDuration, isoWeekInfo,
  loadOrCreateWeek, writeWeek, readAllWeeks,
  buildHistory, findPrevious, runHistory, topSet, num, nameKey,
} from './data.js';

/* ---------------- kleine bouwstenen ---------------- */

function Icon({ path, className }) {
  return (
    <svg viewBox="0 0 24 24" className={`icon ${className || ''}`} aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

const ICON = {
  back: 'M15 5l-7 7 7 7',
  left: 'M14 6l-6 6 6 6',
  right: 'M10 6l6 6-6 6',
  check: 'M5 12.5l4.5 4.5L19 7',
  plus: 'M12 6v12M6 12h12',
  minus: 'M6 12h12',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3.5 2',
  run: 'M13.5 5.5a1.5 1.5 0 100-.01M7 20l3-5 3.5-2.5L12 8l4 2.5 3 .5M6 12.5L9 8l4-1.5',
  chart: 'M4 19h16M7 15l3.5-4 3 2.5L19 7',
  bar: 'M4 19h16M7 16V9M12 16V5M17 16v-4',
  skip: 'M6 5l9 7-9 7zM18 5v14',
};

function NumInput({ value, onChange, placeholder, label, suffix }) {
  return (
    <span className="numinput">
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(ev) => onChange(ev.target.value.replace(/[^0-9.,]/g, ''))}
        onFocus={(ev) => ev.target.select()}
      />
      {suffix ? <span className="numinput__suffix">{suffix}</span> : null}
    </span>
  );
}

/* ---------------- rusttimer ---------------- */

function RestBar({ timer, remaining, onAdd, onStop }) {
  const done = remaining <= 0;
  const progress = timer.total > 0 ? Math.max(0, Math.min(1, remaining / timer.total)) : 0;

  return (
    <div className={`restbar ${done ? 'is-done' : ''}`} role="status" aria-live="polite">
      <div className="restbar__fill" style={{ transform: `scaleX(${done ? 1 : 1 - progress})` }} />
      <div className="restbar__inner">
        <div className="restbar__text">
          <span className="restbar__label">{done ? 'Rust voorbij' : 'Rust'}</span>
          <span className="restbar__name">{timer.name}</span>
        </div>
        <span className="restbar__clock">{formatClock(Math.max(0, remaining))}</span>
        <div className="restbar__actions">
          {!done ? (
            <button type="button" className="restbar__btn" onClick={onAdd}>+30s</button>
          ) : null}
          <button type="button" className="restbar__btn restbar__btn--primary" onClick={onStop}>
            {done ? 'Oké' : 'Klaar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- oefening ---------------- */

function setLabel(sets, index) {
  const s = sets[index];
  if (s.type === 'warmup') return 'W';
  const workIndex = sets.slice(0, index + 1).filter((x) => x.type !== 'warmup').length;
  return String(workIndex);
}

function describeSets(sets) {
  const warm = sets.filter((s) => s.type === 'warmup').length;
  const work = sets.length - warm;
  const parts = [];
  if (warm) parts.push(`${warm} opwarmset${warm > 1 ? 's' : ''}`);
  if (work) parts.push(`${work}× tot falen`);
  return parts.join(' · ');
}

function prevSummary(previous) {
  if (!previous) return null;
  const t = previous.top;
  if (!t) return null;
  const bits = [];
  if (t.kg) bits.push(`${t.kg} kg`);
  if (t.reps) bits.push(`${t.reps} reps`);
  if (!bits.length) return null;
  return `${bits.join(' × ')} · ${formatShort(new Date(previous.ts))}`;
}

function ExerciseCard({ exercise, previous, update, remove, onSetDone }) {
  const { name, sets, rest } = exercise;
  const prevText = prevSummary(previous);

  const patchSet = (id, patch) => update((ex) => ({
    ...ex, sets: ex.sets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }));

  const toggleSet = (set) => {
    const nextDone = !set.done;
    patchSet(set.id, { done: nextDone });
    if (nextDone) onSetDone(exercise);
  };

  const cycleRest = () => update((ex) => {
    const i = REST_STEPS.indexOf(ex.rest);
    return { ...ex, rest: REST_STEPS[(i + 1) % REST_STEPS.length] || REST_STEPS[0] };
  });

  const addSet = () => update((ex) => ({ ...ex, sets: [...ex.sets, newSet('work')] }));

  const doneCount = sets.filter((s) => s.done).length;
  const allDone = sets.length > 0 && doneCount === sets.length;

  return (
    <article className={`exercise ${allDone ? 'is-done' : ''}`}>
      <header className="exercise__head">
        <div className="exercise__title">
          <input
            className="exercise__name"
            type="text"
            value={name}
            aria-label="Naam van de oefening"
            placeholder="Oefening"
            onChange={(ev) => { const v = ev.target.value; update((ex) => ({ ...ex, name: v })); }}
          />
          <p className="exercise__meta">
            <span>{describeSets(sets)}</span>
            <span className="exercise__count">{doneCount}/{sets.length}</span>
          </p>
        </div>
        <button
          type="button"
          className="restchip"
          onClick={cycleRest}
          aria-label={`Rusttijd ${formatClock(rest)}, tik om aan te passen`}
        >
          <Icon path={ICON.clock} />
          {formatClock(rest)}
        </button>
      </header>

      {prevText ? <p className="exercise__prev">vorige keer · {prevText}</p> : null}

      <div className="sets">
        {sets.map((s, i) => {
          const prevSet = previous ? previous.sets.filter((x) => x.type !== 'warmup')[
            sets.slice(0, i + 1).filter((x) => x.type !== 'warmup').length - 1
          ] : null;
          return (
            <div className={`setrow ${s.done ? 'is-done' : ''} ${s.type === 'warmup' ? 'is-warmup' : ''}`} key={s.id}>
              <span className="setrow__label">{setLabel(sets, i)}</span>
              <NumInput
                value={s.kg}
                placeholder={prevSet && prevSet.kg ? prevSet.kg : '–'}
                suffix="kg"
                label={`Gewicht set ${i + 1}`}
                onChange={(v) => patchSet(s.id, { kg: v })}
              />
              <NumInput
                value={s.reps}
                placeholder={prevSet && prevSet.reps ? prevSet.reps : '–'}
                suffix="reps"
                label={`Reps set ${i + 1}`}
                onChange={(v) => patchSet(s.id, { reps: v })}
              />
              <button
                type="button"
                className="setcheck"
                aria-pressed={s.done}
                aria-label={`Set ${i + 1} afvinken`}
                onClick={() => toggleSet(s)}
              >
                <Icon path={ICON.check} />
              </button>
              <button
                type="button"
                className="setdel"
                aria-label={`Set ${i + 1} verwijderen`}
                onClick={() => update((ex) => ({ ...ex, sets: ex.sets.filter((x) => x.id !== s.id) }))}
              >
                <Icon path={ICON.minus} />
              </button>
            </div>
          );
        })}
      </div>

      <footer className="exercise__foot">
        <button type="button" className="linkbtn" onClick={addSet}>+ set</button>
        <button type="button" className="linkbtn linkbtn--quiet" onClick={remove}>oefening weg</button>
      </footer>
    </article>
  );
}

/* ---------------- trainingsdag ---------------- */

function SessionHeader({ day, seconds, onBack }) {
  const over = seconds > SESSION_GOAL;
  const pct = Math.min(1, seconds / SESSION_GOAL);
  const date = day.date;

  return (
    <header className="dayhead">
      <div className="dayhead__top">
        <button type="button" className="iconbtn" onClick={onBack} aria-label="Terug naar de week">
          <Icon path={ICON.back} />
        </button>
        <div className="dayhead__title">
          <span className="dayhead__eyebrow">Dag {day.id} · {WEEKDAYS[DAY_IDS.indexOf(day.id)]} {formatShort(date)}</span>
          <h1>{day.label}</h1>
        </div>
      </div>
      <div className={`sessionbar ${over ? 'is-over' : ''}`}>
        <div className="sessionbar__track"><span style={{ width: `${pct * 100}%` }} /></div>
        <div className="sessionbar__row">
          <span className="sessionbar__time">{formatDuration(seconds)}</span>
          <span className="sessionbar__goal">{over ? 'over de 60 min' : 'doel 60 min'}</span>
        </div>
      </div>
    </header>
  );
}

function LiftDay({ day, date, history, updateDay, onBack, startRest }) {
  const [now, setNow] = useState(Date.now());

  // Sessieklok: loopt zolang deze dag open staat.
  useEffect(() => {
    updateDay((d) => (d.session.running ? d : {
      ...d, session: { ...d.session, running: true, startedAt: Date.now() },
    }));
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(tick);
      updateDay((d) => {
        if (!d.session.running) return d;
        const extra = d.session.startedAt ? (Date.now() - d.session.startedAt) / 1000 : 0;
        return { ...d, session: { seconds: d.session.seconds + extra, running: false, startedAt: null } };
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = day.session.seconds + (day.session.running && day.session.startedAt
    ? Math.max(0, (now - day.session.startedAt) / 1000) : 0);

  const updateExercise = (id, fn) => updateDay((d) => withDone({
    ...d, exercises: d.exercises.map((ex) => (ex.id === id ? fn(ex) : ex)),
  }));

  const removeExercise = (id) => updateDay((d) => withDone({
    ...d, exercises: d.exercises.filter((ex) => ex.id !== id),
  }));

  const addExercise = () => updateDay((d) => withDone({
    ...d, exercises: [...d.exercises, newExercise({ name: '', warm: 0, work: 2, rest: 90 })],
  }));

  const ts = date.getTime();

  return (
    <div className="screen">
      <SessionHeader day={{ ...day, date }} seconds={live} onBack={onBack} />
      <div className="screen__body">
        {day.exercises.map((ex) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            previous={findPrevious(history, ex.name, ts)}
            update={(fn) => updateExercise(ex.id, fn)}
            remove={() => removeExercise(ex.id)}
            onSetDone={startRest}
          />
        ))}
        <button type="button" className="bigbtn" onClick={addExercise}>+ oefening toevoegen</button>
      </div>
    </div>
  );
}

// De dag is klaar zodra alle sets van alle oefeningen afgevinkt zijn.
function withDone(day) {
  const sets = (day.exercises || []).flatMap((ex) => ex.sets);
  const complete = sets.length > 0 && sets.every((s) => s.done);
  return complete === day.done ? day : { ...day, done: complete };
}

function RunDay({ day, date, updateDay, onBack }) {
  const patchRun = (patch) => updateDay((d) => ({ ...d, run: { ...d.run, ...patch } }));

  return (
    <div className="screen">
      <header className="dayhead">
        <div className="dayhead__top">
          <button type="button" className="iconbtn" onClick={onBack} aria-label="Terug naar de week">
            <Icon path={ICON.back} />
          </button>
          <div className="dayhead__title">
            <span className="dayhead__eyebrow">Dag {day.id} · {WEEKDAYS[DAY_IDS.indexOf(day.id)]} {formatShort(date)}</span>
            <h1>{day.label}</h1>
          </div>
        </div>
      </header>
      <div className="screen__body">
        <article className="exercise">
          <div className="runform">
            <label className="field">
              <span className="field__label">Afstand</span>
              <NumInput
                value={day.run.distance}
                suffix="km"
                label="Afstand in kilometer"
                placeholder={PROGRAM[day.id].distance}
                onChange={(v) => patchRun({ distance: v })}
              />
            </label>
            <label className="field">
              <span className="field__label">Tijd</span>
              <span className="numinput">
                <input
                  type="text"
                  inputMode="numeric"
                  value={day.run.time}
                  placeholder="52:30"
                  aria-label="Tijd"
                  onChange={(ev) => patchRun({ time: ev.target.value })}
                  onFocus={(ev) => ev.target.select()}
                />
              </span>
            </label>
          </div>
          <label className="field">
            <span className="field__label">Notitie</span>
            <textarea
              className="notefield"
              rows="3"
              value={day.run.note}
              placeholder="Hoe voelde het? Route, weer, tempo…"
              aria-label="Notitie"
              onChange={(ev) => patchRun({ note: ev.target.value })}
            />
          </label>
          <button
            type="button"
            className={`bigbtn ${day.done ? 'is-on' : ''}`}
            aria-pressed={day.done}
            onClick={() => updateDay((d) => ({ ...d, done: !d.done }))}
          >
            <Icon path={ICON.check} />
            {day.done ? 'Gelopen' : 'Markeer als gelopen'}
          </button>
        </article>
      </div>
    </div>
  );
}

function RestDay({ day, date, updateDay, onBack }) {
  return (
    <div className="screen">
      <header className="dayhead">
        <div className="dayhead__top">
          <button type="button" className="iconbtn" onClick={onBack} aria-label="Terug naar de week">
            <Icon path={ICON.back} />
          </button>
          <div className="dayhead__title">
            <span className="dayhead__eyebrow">Dag {day.id} · {WEEKDAYS[DAY_IDS.indexOf(day.id)]} {formatShort(date)}</span>
            <h1>Rust</h1>
          </div>
        </div>
      </header>
      <div className="screen__body">
        <article className="exercise restcard">
          <p className="restcard__text">Rustdag. Herstel is waar de winst zit.</p>
          <button
            type="button"
            className={`bigbtn ${day.done ? 'is-on' : ''}`}
            aria-pressed={day.done}
            onClick={() => updateDay((d) => ({ ...d, done: !d.done }))}
          >
            <Icon path={ICON.check} />
            {day.done ? 'Genoteerd' : 'Rust genomen'}
          </button>
        </article>
      </div>
    </div>
  );
}

/* ---------------- weekoverzicht ---------------- */

function DayRow({ day, date, isToday, onOpen }) {
  const meta = [];
  if (day.type === 'lift') {
    const sets = day.exercises.flatMap((e) => e.sets);
    meta.push(`${day.exercises.length} oefeningen`);
    meta.push(`${sets.filter((s) => s.done).length}/${sets.length} sets`);
    if (day.session.seconds > 30) meta.push(formatDuration(day.session.seconds));
  } else if (day.type === 'run') {
    meta.push(day.run.distance ? `${day.run.distance} km` : 'afstand vrij');
    if (day.run.time) meta.push(day.run.time);
  } else {
    meta.push('geen training');
  }

  return (
    <button
      type="button"
      className={`dayrow dayrow--${day.type} ${day.done ? 'is-done' : ''} ${isToday ? 'is-today' : ''}`}
      onClick={onOpen}
    >
      <span className="dayrow__id">{day.id}</span>
      <span className="dayrow__main">
        <span className="dayrow__label">
          {day.label}
          {isToday ? <em className="badge">vandaag</em> : null}
        </span>
        <span className="dayrow__meta">{meta.join(' · ')}</span>
      </span>
      <span className="dayrow__right">
        <span className="dayrow__date">{WEEKDAYS_SHORT[DAY_IDS.indexOf(day.id)]} {formatShort(date)}</span>
        <span className="dayrow__status">
          {day.done ? <Icon path={ICON.check} className="icon--check" /> : <Icon path={ICON.right} />}
        </span>
      </span>
    </button>
  );
}

function WeekScreen({ week, weekKey, today, onOpenDay, onShiftWeek, onToday }) {
  const info = isoWeekInfo(mondayOfWeekKey(weekKey));
  const monday = mondayOfWeekKey(weekKey);
  const isCurrent = weekKeyOf(today) === weekKey;

  const trainings = DAY_IDS.filter((id) => week.days[id].type !== 'rest');
  const doneCount = trainings.filter((id) => week.days[id].done).length;
  const totalTime = DAY_IDS.reduce((sum, id) => sum + (week.days[id].session ? week.days[id].session.seconds : 0), 0);

  return (
    <div className="screen">
      <header className="weekhead">
        <div className="weekhead__nav">
          <button type="button" className="iconbtn" onClick={() => onShiftWeek(-1)} aria-label="Vorige week">
            <Icon path={ICON.left} />
          </button>
          <div className="weekhead__title">
            <h1>Week {info.week}</h1>
            <span>{formatShort(monday)} – {formatShort(addDays(monday, 6))}</span>
          </div>
          <button type="button" className="iconbtn" onClick={() => onShiftWeek(1)} aria-label="Volgende week">
            <Icon path={ICON.right} />
          </button>
        </div>
        <div className="weekhead__stats">
          <span><strong>{doneCount}</strong>/{trainings.length} gedaan</span>
          {totalTime > 60 ? <span><strong>{formatDuration(totalTime)}</strong> getraind</span> : null}
          {!isCurrent ? (
            <button type="button" className="linkbtn" onClick={onToday}>naar deze week</button>
          ) : null}
        </div>
      </header>

      <div className="screen__body">
        {DAY_IDS.map((id) => {
          const date = dateOfDay(weekKey, id);
          return (
            <DayRow
              key={id}
              day={week.days[id]}
              date={date}
              isToday={sameDay(date, today)}
              onOpen={() => onOpenDay(id)}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- geschiedenis ---------------- */

function LineChart({ sessions }) {
  // useId levert tekens als ':' op; die kunnen niet in een url(#…)-verwijzing.
  const fadeId = `fade${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const points = sessions
    .map((s) => ({ ts: s.ts, kg: num(s.top && s.top.kg), reps: num(s.top && s.top.reps) }))
    .filter((p) => p.kg !== null)
    .slice(-12);

  if (points.length < 2) {
    return <p className="chart__empty">Nog te weinig data voor een grafiek — log deze oefening nog een keer.</p>;
  }

  const W = 320;
  const H = 120;
  const padX = 10;
  const padY = 16;
  const values = points.map((p) => p.kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const lo = min - span * 0.25;
  const hi = max + span * 0.25;

  const x = (i) => padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v) => padY + (1 - (v - lo) / (hi - lo)) * (H - padY * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');
  const area = `${line} L${x(points.length - 1).toFixed(1)},${H - padY} L${x(0).toFixed(1)},${H - padY} Z`;
  const last = points[points.length - 1];
  const first = points[0];
  const delta = last.kg - first.kg;

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" role="img"
        aria-label={`Verloop van het topgewicht: van ${first.kg} naar ${last.kg} kilo`}>
        <defs>
          <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} className="chart__area" fill={`url(#${fadeId})`} />
        <path d={line} className="chart__line" />
        {points.map((p, i) => (
          <circle key={p.ts} cx={x(i)} cy={y(p.kg)} r={i === points.length - 1 ? 4.5 : 2.5}
            className={i === points.length - 1 ? 'chart__dot chart__dot--last' : 'chart__dot'} />
        ))}
      </svg>
      <div className="chart__axis">
        <span>{formatShort(new Date(first.ts))}</span>
        <span className={delta > 0 ? 'chart__delta is-up' : delta < 0 ? 'chart__delta is-down' : 'chart__delta'}>
          {delta > 0 ? '+' : ''}{delta !== 0 ? `${Math.round(delta * 10) / 10} kg` : 'gelijk'}
        </span>
        <span>{formatShort(new Date(last.ts))}</span>
      </div>
    </div>
  );
}

function HistoryCard({ entry }) {
  const [open, setOpen] = useState(false);
  const sessions = entry.sessions;
  const last = sessions[sessions.length - 1];
  const lastText = last && last.top
    ? `${last.top.kg ? `${last.top.kg} kg` : ''}${last.top.kg && last.top.reps ? ' × ' : ''}${last.top.reps ? `${last.top.reps} reps` : ''}`
    : '—';

  return (
    <article className="histcard">
      <button type="button" className="histcard__head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className="histcard__name">{entry.name}</span>
        <span className="histcard__last">{lastText}</span>
        <span className="histcard__count">{sessions.length}×</span>
      </button>
      <LineChart sessions={sessions} />
      {open ? (
        <ul className="histlist">
          {sessions.slice().reverse().slice(0, 10).map((s) => (
            <li key={s.ts}>
              <span className="histlist__date">{formatShort(new Date(s.ts))}</span>
              <span className="histlist__sets">
                {s.sets.map((set, i) => (
                  <span key={i} className={set.type === 'warmup' ? 'is-warmup' : ''}>
                    {set.kg || '–'}×{set.reps || '–'}
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="histcard__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? 'verberg sessies' : 'toon sessies'}
      </button>
    </article>
  );
}

function HistoryScreen({ refreshKey }) {
  const weeks = useMemo(() => readAllWeeks(), [refreshKey]);
  const history = useMemo(() => buildHistory(weeks), [weeks]);
  const runs = useMemo(() => runHistory(weeks), [weeks]);

  const entries = useMemo(() => (
    [...history.values()].sort((a, b) => {
      const la = a.sessions[a.sessions.length - 1].ts;
      const lb = b.sessions[b.sessions.length - 1].ts;
      return lb - la;
    })
  ), [history]);

  return (
    <div className="screen">
      <header className="weekhead">
        <div className="weekhead__title weekhead__title--solo">
          <h1>Geschiedenis</h1>
          <span>Zwaarste werkset per sessie</span>
        </div>
      </header>
      <div className="screen__body">
        {entries.length === 0 ? (
          <p className="empty">Nog niets gelogd. Vul bij een training gewicht en reps in, dan verschijnt hier het verloop.</p>
        ) : entries.map((entry) => <HistoryCard key={entry.name} entry={entry} />)}

        {runs.length ? (
          <section className="runsection">
            <h2 className="runsection__title">Hardlopen</h2>
            <ul className="runlist">
              {runs.slice().reverse().map((r) => (
                <li key={r.ts}>
                  <span className="runlist__date">{formatShort(new Date(r.ts))}</span>
                  <span className="runlist__dist">{r.distance ? `${r.distance} km` : '—'}</span>
                  <span className="runlist__time">{r.time || '—'}</span>
                  {r.note ? <span className="runlist__note">{r.note}</span> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- app ---------------- */

function App() {
  const [today, setToday] = useState(() => new Date());
  const [weekKey, setWeekKey] = useState(() => weekKeyOf(new Date()));
  const [week, setWeek] = useState(() => loadOrCreateWeek(weekKeyOf(new Date())));
  const [dayId, setDayId] = useState(null);
  const [tab, setTab] = useState('week');
  const [timer, setTimer] = useState(null); // {name, total, endsAt}
  const [now, setNow] = useState(Date.now());

  // Week wisselen laadt (of maakt) die week.
  useEffect(() => { setWeek(loadOrCreateWeek(weekKey)); }, [weekKey]);

  // Elke wijziging gaat meteen naar localStorage.
  useEffect(() => { writeWeek(week); }, [week]);

  // Rond middernacht (of na terugkeren uit de achtergrond) opnieuw bepalen
  // welke dag "vandaag" is, zodat maandag vanzelf een nieuwe week opent.
  useEffect(() => {
    const check = () => {
      const d = new Date();
      if (!sameDay(d, today)) {
        setToday(d);
        if (weekKeyOf(d) !== weekKey && dayId === null) setWeekKey(weekKeyOf(d));
      }
    };
    const i = setInterval(check, 60000);
    document.addEventListener('visibilitychange', check);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', check); };
  }, [today, weekKey, dayId]);

  // Rusttimer tikt alleen als hij loopt.
  useEffect(() => {
    if (!timer) return undefined;
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, [timer]);

  const remaining = timer ? (timer.endsAt - now) / 1000 : 0;

  const updateDay = useCallback((id, fn) => {
    setWeek((w) => ({ ...w, days: { ...w.days, [id]: fn(w.days[id]) } }));
  }, []);

  const startRest = useCallback((exercise) => {
    setNow(Date.now());
    setTimer({ name: exercise.name || 'Rust', total: exercise.rest, endsAt: Date.now() + exercise.rest * 1000 });
  }, []);

  const history = useMemo(() => buildHistory(readAllWeeks()), [weekKey, dayId, tab]);

  const day = dayId ? week.days[dayId] : null;
  const dayDate = dayId ? dateOfDay(weekKey, dayId) : null;
  const closeDay = () => setDayId(null);

  let content;
  if (day && day.type === 'lift') {
    content = (
      <LiftDay
        key={`${weekKey}-${dayId}`}
        day={day}
        date={dayDate}
        history={history}
        updateDay={(fn) => updateDay(dayId, fn)}
        onBack={closeDay}
        startRest={startRest}
      />
    );
  } else if (day && day.type === 'run') {
    content = <RunDay day={day} date={dayDate} updateDay={(fn) => updateDay(dayId, fn)} onBack={closeDay} />;
  } else if (day) {
    content = <RestDay day={day} date={dayDate} updateDay={(fn) => updateDay(dayId, fn)} onBack={closeDay} />;
  } else if (tab === 'history') {
    content = <HistoryScreen refreshKey={`${weekKey}-${tab}`} />;
  } else {
    content = (
      <WeekScreen
        week={week}
        weekKey={weekKey}
        today={today}
        onOpenDay={setDayId}
        onShiftWeek={(delta) => setWeekKey((k) => shiftWeekKey(k, delta))}
        onToday={() => setWeekKey(weekKeyOf(new Date()))}
      />
    );
  }

  return (
    <div className={`app ${timer ? 'has-timer' : ''}`}>
      {content}

      {timer ? (
        <RestBar
          timer={timer}
          remaining={remaining}
          onAdd={() => setTimer((t) => (t ? { ...t, total: t.total + 30, endsAt: t.endsAt + 30000 } : t))}
          onStop={() => setTimer(null)}
        />
      ) : null}

      {!day ? (
        <nav className="tabbar">
          <button type="button" className={tab === 'week' ? 'is-on' : ''} onClick={() => setTab('week')}>
            <Icon path={ICON.bar} />
            Week
          </button>
          <button type="button" className={tab === 'history' ? 'is-on' : ''} onClick={() => setTab('history')}>
            <Icon path={ICON.chart} />
            Geschiedenis
          </button>
        </nav>
      ) : null}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
