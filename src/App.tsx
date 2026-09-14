import { useCallback, useMemo, useState } from 'react';
import { Brain, Coffee, GitFork, History, Play, RotateCcw, Sparkles } from 'lucide-react';
import { clearSessions, loadSessions, saveSession } from './storage';
import type { AppStep, DifficultyRating, Session } from './types';
import { formatTime, useCountdown } from './useCountdown';

const sprintMinutes = Number.parseFloat(import.meta.env.VITE_SPRINT_MINUTES ?? '25');
const sprintSeconds = Math.max(1, Math.round((Number.isFinite(sprintMinutes) ? sprintMinutes : 25) * 60));

const ratings: Array<{ value: DifficultyRating; label: string; emoji: string; description: string }> = [
  { value: 'easy', label: 'Easy', emoji: '🌿', description: 'Flowing' },
  { value: 'medium', label: 'Medium', emoji: '⛰️', description: 'Some friction' },
  { value: 'hard', label: 'Hard', emoji: '🔥', description: 'Tough' },
];

const ratingScore: Record<DifficultyRating, number> = { easy: 1, medium: 2, hard: 3 };

function newId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function ratingLabel(value?: DifficultyRating) {
  const item = ratings.find((rating) => rating.value === value);
  return item ? `${item.emoji} ${item.label}` : 'Not rated';
}

export function App() {
  const [step, setStep] = useState<AppStep>('start');
  const [task, setTask] = useState('');
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [noteDraft, setNoteDraft] = useState('');

  const completePart1 = useCallback(() => setStep('rate1'), []);
  const completePart2 = useCallback(() => setStep('rate2'), []);

  const part1Timer = useCountdown(sprintSeconds, step === 'part1', completePart1);
  const part2Timer = useCountdown(sprintSeconds, step === 'part2', completePart2);

  const insight = useMemo(() => {
    if (!session?.part1Rating || !session.part2Rating) return 'Rate both halves to see your split insight.';
    const first = ratingScore[session.part1Rating];
    const second = ratingScore[session.part2Rating];
    if (first === second) return 'Both halves felt equally difficult. Your effort was steady across the fork.';
    if (first > second) return 'The first half felt harder. Starting may have been the main friction point.';
    return 'The second half felt harder. Fatigue, ambiguity, or follow-through may be the friction point.';
  }, [session]);

  function startSession() {
    const cleaned = task.trim();
    if (!cleaned) return;
    const next: Session = { id: newId(), task: cleaned, startAt: new Date().toISOString() };
    setSession(next);
    setNoteDraft('');
    part1Timer.reset();
    part2Timer.reset();
    setStep('part1');
  }

  function ratePart1(value: DifficultyRating) {
    if (!session) return;
    setSession({ ...session, splitAt: new Date().toISOString(), part1Rating: value });
    setStep('break');
  }

  function startPart2() {
    part2Timer.reset();
    setStep('part2');
  }

  function finishSession(value: DifficultyRating) {
    if (!session) return;
    const completed: Session = {
      ...session,
      part2Rating: value,
      endAt: new Date().toISOString(),
      note: noteDraft.trim(),
    };
    setSession(completed);
    setSessions(saveSession(completed));
    setStep('summary');
  }

  function resetToStart() {
    setTask('');
    setSession(null);
    setNoteDraft('');
    setStep('start');
  }

  function clearHistory() {
    clearSessions();
    setSessions([]);
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="brand"><GitFork size={28} /> Focus Fork</div>
        <h1>Split one task into two focused sprints.</h1>
        <p>Work the first half, pause, then work the second half. Rate each side to learn where the task got sticky.</p>
      </section>

      <section className="card">
        {step === 'start' && (
          <div className="stack">
            <div className="section-title"><Brain /> What are you focusing on?</div>
            <input className="task-input" value={task} onChange={(event) => setTask(event.target.value)} placeholder="e.g. Draft project proposal" onKeyDown={(event) => { if (event.key === 'Enter') startSession(); }} />
            <button className="primary" onClick={startSession} disabled={!task.trim()}><Play size={18} /> Start 2-part session</button>
            <p className="muted">Each half is {formatTime(sprintSeconds)}. Set <code>VITE_SPRINT_MINUTES</code> in .env to change it.</p>
          </div>
        )}

        {(step === 'part1' || step === 'part2') && (
          <TimerPanel part={step === 'part1' ? 1 : 2} task={session?.task ?? ''} remaining={step === 'part1' ? part1Timer.remaining : part2Timer.remaining} progress={step === 'part1' ? part1Timer.progress : part2Timer.progress} onSkip={step === 'part1' ? completePart1 : completePart2} />
        )}

        {step === 'rate1' && <RatingPanel title="How hard did the first half feel?" onRate={ratePart1} />}

        {step === 'break' && (
          <div className="center stack">
            <Coffee size={48} className="accent" />
            <h2>Break point reached</h2>
            <p className="muted">Stand up, breathe, or jot down what changed. When ready, start the second half.</p>
            <button className="primary" onClick={startPart2}><Play size={18} /> Start Part 2</button>
          </div>
        )}

        {step === 'rate2' && (
          <div className="stack">
            <RatingPanel title="How hard did the second half feel?" onRate={finishSession} />
            <label className="note-label" htmlFor="note">Optional reflection note</label>
            <textarea id="note" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="What made one half harder?" />
          </div>
        )}

        {step === 'summary' && session && (
          <Summary session={session} insight={insight} onNew={resetToStart} />
        )}
      </section>

      {step === 'start' && (
        <section className="card history-card">
          <div className="history-heading"><span><History size={18} /> Recent split results</span>{sessions.length > 0 && <button className="link" onClick={clearHistory}>Clear</button>}</div>
          {sessions.length === 0 ? <p className="muted">No saved sessions yet. Finish one fork to see it here.</p> : sessions.map((item) => (
            <div className="history-item" key={item.id}>
              <strong>{item.task}</strong>
              <span>{ratingLabel(item.part1Rating)} → {ratingLabel(item.part2Rating)}</span>
              <small>{formatDate(item.endAt)}</small>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}

function TimerPanel({ part, task, remaining, progress, onSkip }: { part: 1 | 2; task: string; remaining: number; progress: number; onSkip: () => void }) {
  return (
    <div className="center stack">
      <div className="pill">Part {part} of 2</div>
      <h2>{task}</h2>
      <div className="timer">{formatTime(remaining)}</div>
      <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      <p className="muted">Stay with the task until this half ends.</p>
      <button className="secondary" onClick={onSkip}>Finish this half now</button>
    </div>
  );
}

function RatingPanel({ title, onRate }: { title: string; onRate: (rating: DifficultyRating) => void }) {
  return (
    <div className="stack">
      <h2>{title}</h2>
      <div className="rating-grid">
        {ratings.map((rating) => (
          <button className="rating" key={rating.value} onClick={() => onRate(rating.value)}>
            <span>{rating.emoji}</span>
            <strong>{rating.label}</strong>
            <small>{rating.description}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Summary({ session, insight, onNew }: { session: Session; insight: string; onNew: () => void }) {
  return (
    <div className="stack">
      <div className="section-title"><Sparkles /> Split results</div>
      <h2>{session.task}</h2>
      <div className="summary-grid">
        <div><small>Started</small><strong>{formatDate(session.startAt)}</strong></div>
        <div><small>Split point</small><strong>{formatDate(session.splitAt)}</strong></div>
        <div><small>Ended</small><strong>{formatDate(session.endAt)}</strong></div>
      </div>
      <div className="fork-result">
        <div><span>Part 1</span><strong>{ratingLabel(session.part1Rating)}</strong></div>
        <div className="fork-line" />
        <div><span>Part 2</span><strong>{ratingLabel(session.part2Rating)}</strong></div>
      </div>
      <p className="insight">{insight}</p>
      {session.note && <blockquote>{session.note}</blockquote>}
      <button className="primary" onClick={onNew}><RotateCcw size={18} /> Start another fork</button>
    </div>
  );
}
