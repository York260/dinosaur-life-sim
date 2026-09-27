import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { GameState, EndgameSummary, ArenaOutcome } from '../engine/types';
import {
  EndgameRun, TrialOption, QuizQuestion, StepResult, IMPACT_FACTS, WINTER_ROUNDS, WINTER_SOURCE,
  initRun, trial1Options, resolveTrial1, trial2Options, resolveTrial2, trial2BossCalls,
  winterOptions, resolveWinterRound, winterHint, pickQuiz, quizAutoEliminate, computeEnding,
} from '../engine/endgame';
import { endingAchievements, arenaAchievements, unlock, ACHIEVEMENTS } from '../engine/achievements';
import { buildArenaConfig } from '../combat/config';
import { getEffectiveStat } from '../engine/traits';
import { rollD20 } from '../engine/dice';
import './EndGame.css';

const CombatArena = lazy(() => import('./CombatArena'));
const LifeReport = lazy(() => import('./LifeReport'));

type Step = 'intro' | 'choose' | 'quiz' | 'boss' | 'result';

interface Props {
  state: GameState;
  onEnding: (summary: EndgameSummary) => void;
  onRestart: () => void;
  onArenaAchievements: (ids: string[]) => void;
}

const TRIAL_META = [
  { n: 'Ⅰ', name: '天火', desc: '撞擊後數十分鐘至數小時：熔融碎屑重返大氣，天空炙熱如烤箱，大地陷入火海。' },
  { n: 'Ⅱ', name: '混亂', desc: '劇烈的地震與海嘯撕裂大地。一頭被天火灼傷、因飢餓而瘋狂的巨獸，盯上了你們的避難所。' },
  { n: 'Ⅲ', name: '長夜', desc: '煙塵遮天蔽日，撞擊冬天降臨。你必須讀懂環境數據，做出正確的生存策略。' },
];

function RunStatus({ run, trial }: { run: EndgameRun; trial: number }) {
  return (
    <div className="eg-status">
      <span className={run.hp <= 25 ? 'danger' : ''}>❤️ {run.hp}</span>
      <span>🦕 族群 {run.pack}</span>
      {trial >= 3 && <span className={run.food < 25 ? 'danger' : ''}>🍖 食物 {run.food}</span>}
      {trial >= 3 && <span className={run.warmth < 25 ? 'danger' : ''}>🔥 體溫 {run.warmth}</span>}
      {run.knowledge > 0 && <span>📖 知識 {run.knowledge}</span>}
      <span>⭐ 評分 {run.score}</span>
    </div>
  );
}

export default function EndGame({ state, onEnding, onRestart, onArenaAchievements }: Props) {
  const initial = useMemo(() => initRun(state), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [run, setRun] = useState<EndgameRun>(initial.run);
  const [step, setStep] = useState<Step>('intro');
  const [trial, setTrial] = useState(1);
  const [round, setRound] = useState(0);
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [eliminated, setEliminated] = useState<number[]>([]);
  const [answer, setAnswer] = useState<number | null>(null);
  const [result, setResult] = useState<StepResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  const isChicken = state.species?.id === 'chicken';

  const options: TrialOption[] = useMemo(() => {
    if (trial === 1) return trial1Options(state, run);
    if (trial === 2) return trial2Options(state, run);
    return winterOptions(state, run, round);
  }, [trial, round, run, state]);

  const finalize = useCallback((finalRun: EndgameRun) => {
    const base = computeEnding(state, finalRun);
    const fresh = unlock(endingAchievements(state, base.ending, finalRun.hp, finalRun.quizCorrect, finalRun.quizTotal));
    onEnding({ ...base, newAchievements: fresh });
  }, [state, onEnding]);

  const applyResult = useCallback((r: StepResult) => {
    setRun(r.run);
    setResult(r);
    setStep('result');
  }, []);

  // ---------- 選擇 ----------
  const choose = useCallback((opt: TrialOption) => {
    if (opt.disabled) return;
    if (opt.kind === 'quiz') {
      const q = pickQuiz(trial as 1 | 2);
      const wrong = q.options.map((o, i) => (o.correct ? -1 : i)).filter(i => i >= 0);
      let n = quizAutoEliminate(state);
      if (trial === 1 && state.flags.ptero_friend) n += 1;
      setEliminated(wrong.sort(() => Math.random() - 0.5).slice(0, Math.min(2, n)));
      setQuiz(q);
      setAnswer(null);
      setStep('quiz');
      return;
    }
    if (opt.kind === 'boss') {
      setStep('boss');
      return;
    }
    if (trial === 1) applyResult(resolveTrial1(state, run, opt.id));
    else if (trial === 2) applyResult(resolveTrial2(state, run, opt.id));
    else applyResult(resolveWinterRound(state, run, round, opt.id));
    setHint(null);
  }, [trial, round, run, state, applyResult]);

  const spendKnowledge = () => {
    if (!quiz || run.knowledge < 2) return;
    const remaining = quiz.options.map((o, i) => (!o.correct && !eliminated.includes(i) ? i : -1)).filter(i => i >= 0);
    if (remaining.length === 0) return;
    setEliminated([...eliminated, remaining[0]]);
    setRun({ ...run, knowledge: run.knowledge - 2 });
  };

  const spendWinterHint = () => {
    if (hint) return;
    if (!isChicken) {
      if (run.knowledge < 2) return;
      setRun({ ...run, knowledge: run.knowledge - 2 });
    }
    setHint(winterHint(state, round));
  };

  const submitQuiz = () => {
    if (answer === null || !quiz) return;
    const picked = quiz.options[answer];
    const correct = picked.correct;
    const r = trial === 1
      ? resolveTrial1(state, run, 'quiz', correct)
      : resolveTrial2(state, run, 'quiz', { quizCorrect: correct });
    const right = quiz.options.find(o => o.correct)!;
    const explain = correct
      ? `\n\n📖 ${picked.why}`
      : `\n\n📖 你的選擇：${picked.why}\n✔ 正解是「${right.text}」：${right.why}`;
    applyResult({ ...r, text: `${r.text}${explain}\n\n${quiz.source}` });
  };

  const next = useCallback(() => {
    if (run.dead) {
      finalize(run);
      return;
    }
    setResult(null);
    setHint(null);
    if (trial === 1) {
      setTrial(2);
      setStep('choose');
    } else if (trial === 2) {
      setTrial(3);
      setRound(0);
      setStep('choose');
    } else if (round < WINTER_ROUNDS.length - 1) {
      setRound(round + 1);
      setStep('choose');
    } else {
      finalize(run);
    }
  }, [run, trial, round, finalize]);

  // ---------- BOSS ----------
  const onBossEnd = (o: ArenaOutcome) => {
    onArenaAchievements(arenaAchievements(o, 'scorched_tyrant'));
    applyResult(resolveTrial2(state, run, 'boss', { arena: o }));
  };

  const autoBoss = () => {
    const str = getEffectiveStat(state.stats.str, 'str', state.traits, state.hunger);
    const r = rollD20();
    const win = r === 20 || (r !== 1 && r + Math.floor(str / 5) + run.pack >= 18);
    const hpAfter = win ? Math.max(1, run.hp - 30) : run.pack > 0 ? 10 : 0;
    onBossEnd({
      result: win ? 'victory' : run.pack > 0 ? 'defeat' : 'death',
      hpLost: run.hp - hpAfter, finalHp: hpAfter, packLost: win ? 0 : 1,
      damageDealt: 0, perfectDodges: 0, maxCombo: 0, interrupts: 0, timeSec: 0, enemyName: '焦土暴君',
    });
  };

  // ---------- 鍵盤：數字鍵選擇、Enter 繼續 ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (step === 'intro' && e.key === 'Enter') setStep('choose');
      else if (step === 'result' && e.key === 'Enter') next();
      else if (step === 'choose') {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < options.length) choose(options[i]);
      } else if (step === 'quiz' && quiz) {
        const i = Number(e.key) - 1;
        if (i >= 0 && i < quiz.options.length && !eliminated.includes(i)) setAnswer(i);
        if (e.key === 'Enter' && answer !== null) submitQuiz();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // ================= 結局畫面 =================
  if (state.phase === 'RESULT' && state.endgame) {
    const s = state.endgame;
    const emoji = { total_wipe: '☄️', lone_survivor: '🦖', pack_survives: '🌅', legend: '🌟' }[s.ending];
    return (
      <div className={`eg-screen eg-final ending-${s.ending} fade-in`}>
        <div className="eg-final-emoji">{emoji}</div>
        <div className={`eg-rank rank-${s.rank}`}>{s.rank}</div>
        <h2>{s.title}</h2>
        <button className="report-btn" onClick={() => setShowReport(true)}>📜 生成生涯報告</button>
        <div className="eg-card eg-narrative">{s.narrative}</div>
        <div className="eg-final-stats">
          <div><b>{state.year - 1}</b><span>存活年數</span></div>
          <div><b>{s.finalPack}</b><span>倖存族人</span></div>
          <div><b>{s.score}</b><span>審判評分</span></div>
          <div><b>{state.runStats.fightsWon}</b><span>戰鬥勝場</span></div>
        </div>
        <div className="eg-card eg-log">
          <div className="eg-log-title">審判紀錄</div>
          {s.log.map((l, i) => (
            <div key={i} className={`eg-log-item ${l.good ? 'good' : 'bad'}`}>
              <b>{l.good ? '✔' : '✘'} {l.title}</b>
              <p>{l.text}</p>
            </div>
          ))}
        </div>
        <div className="eg-card eg-fossil">{s.fossil}</div>
        {s.newAchievements.length > 0 && (
          <div className="eg-card eg-achv">
            <div className="eg-log-title">🏆 新成就</div>
            {s.newAchievements.map(id => {
              const a = ACHIEVEMENTS.find(x => x.id === id);
              return a ? <div key={id}>{a.icon} {a.name}<small>　{a.desc}</small></div> : null;
            })}
          </div>
        )}
        <button className="report-btn" onClick={() => setShowReport(true)}>📜 生成生涯報告</button>
        <button className="eg-btn" onClick={onRestart}>再來一局</button>
        {showReport && (
          <Suspense fallback={null}>
            <LifeReport state={state} onClose={() => setShowReport(false)} />
          </Suspense>
        )}
      </div>
    );
  }

  const meta = TRIAL_META[trial - 1];

  // ================= 開場 =================
  if (step === 'intro') {
    return (
      <div className="eg-screen fade-in">
        <div className="eg-impact">
          <div className="eg-flash" />
          <h1>末日降臨</h1>
          <p>第 25 年。天空中那顆越來越亮的星星，今天終於落下了。</p>
        </div>
        <div className="eg-card">
          <div className="eg-facts">
            {IMPACT_FACTS.map(f => (
              <div key={f.label}><span>{f.label}</span><b>{f.value}</b></div>
            ))}
          </div>
        </div>
        <div className="eg-card">
          <div className="eg-log-title">三重審判</div>
          {TRIAL_META.map(t => (
            <div key={t.n} className="eg-trial-preview"><b>{t.n}・{t.name}</b>　{t.desc}</div>
          ))}
        </div>
        {initial.notes.length > 0 && (
          <div className="eg-card">
            <div className="eg-log-title">你的準備</div>
            {initial.notes.map(n => <div key={n} className="eg-note">{n}</div>)}
          </div>
        )}
        <RunStatus run={run} trial={1} />
        <button className="eg-btn" onClick={() => setStep('choose')}>迎接審判（Enter）</button>
      </div>
    );
  }

  // ================= BOSS =================
  if (step === 'boss') {
    return (
      <div className="eg-screen wide fade-in">
        <Suspense fallback={<div className="card">載入 3D 戰場中…</div>}><CombatArena
          config={buildArenaConfig(state, 'scorched_tyrant', 15, 'apocalypse', {
            extraCalls: trial2BossCalls(state), hp: run.hp, packSize: run.pack,
          })}
          title={state.flags.ally_rival ? '審判二：迎戰焦土暴君（老友來援！族群突擊 +2）' : '審判二：迎戰焦土暴君'}
          speciesPassive={state.species?.combatPassive}
          onFinish={onBossEnd}
          onAutoResolve={autoBoss}
        /></Suspense>
      </div>
    );
  }

  // ================= 結果 =================
  if (step === 'result' && result) {
    return (
      <div className="eg-screen fade-in">
        <div className="eg-header">
          <span className="eg-trial-n">{meta.n}</span>
          <h2>{result.title}</h2>
        </div>
        <div className={`eg-card eg-result ${result.good ? 'good' : 'bad'}`}>
          {result.roll && (
            <div className="eg-roll">
              🎲 {result.roll.value} + {result.roll.bonus} = <b>{result.roll.value + result.roll.bonus}</b> vs 難度 {result.roll.dc}
            </div>
          )}
          <div className="eg-verdict">{result.good ? '✔ 成功' : '✘ 失敗'}</div>
          <p>{result.text}</p>
        </div>
        <RunStatus run={run} trial={trial} />
        <button className="eg-btn" onClick={next}>
          {run.dead ? '迎接結局' : trial === 3 && round === WINTER_ROUNDS.length - 1 ? '走出黑暗' : '繼續（Enter）'}
        </button>
      </div>
    );
  }

  // ================= 知識題 =================
  if (step === 'quiz' && quiz) {
    return (
      <div className="eg-screen fade-in">
        <div className="eg-header">
          <span className="eg-trial-n">{meta.n}</span>
          <h2>知識判斷</h2>
        </div>
        <div className="eg-card eg-quiz-prompt">{quiz.prompt}</div>
        {eliminated.length > 0 && (
          <div className="eg-note">🧠 你的智慧與經驗排除了 {eliminated.length} 個錯誤選項。</div>
        )}
        <div className="eg-quiz-options">
          {quiz.options.map((o, i) => {
            const out = eliminated.includes(i);
            const chickenHint = isChicken && o.correct;
            return (
              <button
                key={i}
                disabled={out}
                className={`eg-quiz-opt ${answer === i ? 'picked' : ''} ${out ? 'out' : ''}`}
                onClick={() => setAnswer(i)}
              >
                <span className="eg-key">{i + 1}</span>
                {o.text}
                {chickenHint && <span className="eg-chicken">🐔 咕咕！（你隱約記得……）</span>}
              </button>
            );
          })}
        </div>
        <div className="eg-quiz-actions">
          <button className="eg-btn ghost" disabled={run.knowledge < 2} onClick={spendKnowledge}>
            📖 花 2 點知識排除一個錯誤選項（剩 {run.knowledge}）
          </button>
          <button className="eg-btn" disabled={answer === null} onClick={submitQuiz}>確定答案</button>
        </div>
      </div>
    );
  }

  // ================= 選擇 =================
  const winter = trial === 3 ? WINTER_ROUNDS[round] : null;
  return (
    <div className="eg-screen fade-in">
      <div className="eg-header">
        <span className="eg-trial-n">{meta.n}</span>
        <div>
          <h2>審判{meta.n}・{meta.name}{winter ? `：${winter.title}` : ''}</h2>
          <div className="eg-sub">{winter ? `${winter.subtitle}（第 ${round + 1}/3 回合）` : meta.desc}</div>
        </div>
      </div>

      {winter && (
        <div className="eg-card eg-data">
          <p>{winter.narrative}</p>
          <div className="eg-data-grid">
            {winter.data.map(d => (
              <div key={d.label}><span>{d.label}</span><b>{d.value}</b></div>
            ))}
          </div>
          <div className="eg-data-foot">
            每回合消耗：食物 -{Math.round(22 * (state.species?.sizeMultiplier ?? 1) + run.pack * 2)}（體型越大越多、族人越多越多）；
            體溫 -{Math.round(22 * (state.species?.bodySize === 'large' ? 0.65 : state.species?.bodySize === 'small' ? 1.3 : 1))}（體型越小流失越快）
          </div>
          {hint ? (
            <div className="eg-hint">{hint}</div>
          ) : (
            <button className="eg-btn ghost small" disabled={!isChicken && run.knowledge < 2} onClick={spendWinterHint}>
              {isChicken ? '🐔 咕咕提示（免費）' : `📖 花 2 點知識，推敲最佳策略（剩 ${run.knowledge}）`}
            </button>
          )}
          <div className="eg-source">{WINTER_SOURCE}</div>
        </div>
      )}

      <div className="eg-options">
        {options.map((o, i) => (
          <button key={o.id} className={`eg-option ${o.disabled ? 'disabled' : ''}`} onClick={() => choose(o)} disabled={!!o.disabled}>
            <span className="eg-key">{i + 1}</span>
            <span className="eg-opt-icon">{o.icon}</span>
            <span className="eg-opt-body">
              <span className="eg-opt-label">
                {o.label}
                {o.tag && <em className={`eg-tag tag-${o.tag}`}>{o.tag}</em>}
              </span>
              <span className="eg-opt-desc">{o.disabled ?? o.desc}</span>
            </span>
            {o.rate !== undefined && (
              <span className={`eg-rate ${o.rate >= 60 ? 'hi' : o.rate >= 35 ? 'mid' : 'lo'}`}>{o.rate}%</span>
            )}
          </button>
        ))}
      </div>
      <RunStatus run={run} trial={trial} />
    </div>
  );
}
