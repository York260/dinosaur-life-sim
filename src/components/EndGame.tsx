import { GameState, EndgameChoice, EndgamePhaseResult, EndingType } from '../engine/types';
import { getPhase1Choices, resolvePhase1, getPhase2Choices, resolvePhase2, resolvePhase3 } from '../engine/endgame';

interface PhaseSelectProps {
  phase: 1 | 2 | 3;
  narrative: string;
  choices: EndgameChoice[];
  onSelect: (choiceId: string) => void;
}

function PhaseSelect({ phase, narrative, choices, onSelect }: PhaseSelectProps) {
  const phaseLabels = ['', '階段一：偵測', '階段二：抉擇', '階段三：存亡'];

  return (
    <div className="endgame-screen fade-in">
      <div className="endgame-header card">
        <h2>末日降臨</h2>
        <div className="phase-label">{phaseLabels[phase]}</div>
      </div>

      <div className="card endgame-narrative">
        {narrative}
      </div>

      <div className="endgame-choices">
        {choices.map((c) => (
          <div
            key={c.id}
            className="card endgame-choice"
            onClick={() => onSelect(c.id)}
          >
            <div>
              <div className="choice-label">{c.label}</div>
              <div className="choice-desc">{c.description}</div>
            </div>
            <div className="success-ring" style={{ color: c.successRate >= 50 ? '#27ae60' : '#e74c3c' }}>
              <svg width="48" height="48">
                <circle cx="24" cy="24" r="19" fill="none" stroke="#e8e8e8" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="19"
                  fill="none"
                  stroke={c.successRate >= 50 ? '#27ae60' : '#e74c3c'}
                  strokeWidth="4"
                  strokeDasharray={`${(c.successRate / 100) * 2 * Math.PI * 19} ${2 * Math.PI * 19}`}
                  strokeLinecap="round"
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
              <span className="ring-text">{c.successRate}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ResultScreenProps {
  ending: EndingType;
  narrative: string;
  state: GameState;
  onRestart: () => void;
}

function ResultScreen({ ending, narrative, state, onRestart }: ResultScreenProps) {
  const emojis: Record<EndingType, string> = {
    total_wipe: '☄️',
    lone_survivor: '🦖',
    pack_survives: '🌅',
  };

  const titles: Record<EndingType, string> = {
    total_wipe: '全軍覆沒',
    lone_survivor: '孤獨倖存',
    pack_survives: '族群延續',
  };

  const titleColors: Record<EndingType, string> = {
    total_wipe: '#c0392b',
    lone_survivor: '#f39c12',
    pack_survives: '#27ae60',
  };

  return (
    <div className="result-screen fade-in">
      <div className="result-emoji">{emojis[ending]}</div>
      <h2 style={{ color: titleColors[ending] }}>{titles[ending]}</h2>
      <div className="card result-narrative">{narrative}</div>
      <div className="result-stats">
        <div className="card result-stat">
          <div className="rs-label">存活年數</div>
          <div className="rs-value">{state.year}</div>
        </div>
        <div className="card result-stat">
          <div className="rs-label">族群成員</div>
          <div className="rs-value">{state.packSize}</div>
        </div>
        <div className="card result-stat">
          <div className="rs-label">詞條數</div>
          <div className="rs-value">{state.traits.length}</div>
        </div>
      </div>
      <button className="restart-btn" style={{ background: 'linear-gradient(135deg, #4a7c59, #6b9e7a)' }} onClick={onRestart}>
        再來一局
      </button>
    </div>
  );
}

// ========== Main EndGame Component ==========

interface Props {
  state: GameState;
  onPhaseResult: (result: EndgamePhaseResult) => void;
  onSetEnding: (ending: EndingType) => void;
  onRestart: () => void;
}

export default function EndGame({ state, onPhaseResult, onSetEnding, onRestart }: Props) {
  const { phase, endgameResults, ending } = state;

  // Result screen
  if (phase === 'RESULT' && ending) {
    const lastResult = endgameResults[endgameResults.length - 1];
    return (
      <ResultScreen
        ending={ending}
        narrative={lastResult?.narrative || ''}
        state={state}
        onRestart={onRestart}
      />
    );
  }

  // Phase 1
  if (phase === 'ENDGAME_PHASE1') {
    const choices = getPhase1Choices(state);
    return (
      <PhaseSelect
        phase={1}
        narrative="天空出現了一道不尋常的光芒，大地開始顫抖。你的直覺告訴你——末日即將降臨。你必須做出選擇。"
        choices={choices}
        onSelect={(choiceId) => {
          const result = resolvePhase1(state, choiceId);
          onPhaseResult(result);
        }}
      />
    );
  }

  // Phase 2
  if (phase === 'ENDGAME_PHASE2') {
    const phase1Result = endgameResults[0];
    const choices = getPhase2Choices(state, phase1Result?.success ?? false);
    return (
      <PhaseSelect
        phase={2}
        narrative={phase1Result?.narrative || '情勢危急...'}
        choices={choices}
        onSelect={(choiceId) => {
          const result = resolvePhase2(state, choiceId, phase1Result?.success ?? false);
          onPhaseResult(result);
        }}
      />
    );
  }

  // Phase 3
  if (phase === 'ENDGAME_PHASE3') {
    const phase1Result = endgameResults[0];
    const phase2Result = endgameResults[1];

    const choices: EndgameChoice[] = [
      {
        id: 'face_fate',
        label: '面對命運',
        description: '所有的準備都已完成，接受最終的審判',
        successRate: Math.min(95, Math.max(5,
          Math.floor((state.stats.str + state.stats.agi + state.stats.int + state.stats.cha) / 8) +
          state.packSize * 5 +
          (phase1Result?.success ? 15 : 0) +
          (phase2Result?.success ? 15 : 0)
        )),
      },
    ];

    return (
      <PhaseSelect
        phase={3}
        narrative={phase2Result?.narrative || '最終時刻到來了...'}
        choices={choices}
        onSelect={() => {
          const phase2Choice = endgameResults[1]?.consequence === '獨自存活' ? 'flee_alone' : 'lead_all';
          const { result, ending } = resolvePhase3(
            state,
            phase1Result?.success ?? false,
            phase2Result?.success ?? false,
            phase2Choice
          );
          onPhaseResult(result);
          onSetEnding(ending);
        }}
      />
    );
  }

  return null;
}
