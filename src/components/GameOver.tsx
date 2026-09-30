import { useState } from 'react';
import { GameState } from '../engine/types';
import ReportOverlay from './ReportOverlay';

interface Props {
  cause: string;
  year: number;
  speciesName: string;
  state: GameState;
  onRestart: () => void;
}

const TIPS = [
  '在 3D 戰鬥中，敵人攻擊落空後會「露出破綻」，此時反擊傷害大增。',
  '打不贏的時候，長按 ↓ 可以撤退——活著才有下一次。',
  '飽食與水分都在 50 以上時，每年會自然回復 HP。',
  '救助流浪者、收養被遺棄的蛋，都能在沒有伴侶的情況下擴展族群。',
  '有族群時，致命傷害會由一名族人代為承受。',
  '「休養」類行動連續兩年可以治好跛足。',
  '末日前幾年的「前兆」事件，能為三重審判預先做好準備。',
  '選擇帶有 📖 的行動可以累積古生物知識，在末日知識題中派上用場。',
];

export default function GameOver({ cause, year, speciesName, state, onRestart }: Props) {
  const tip = TIPS[(year + state.runStats.fightsWon) % TIPS.length];
  const [showReport, setShowReport] = useState(false);
  return (
    <div className="game-over-screen fade-in">
      <div className="skull">💀</div>
      <h2>遊戲結束</h2>
      <div className="death-cause">{cause}</div>
      <div className="death-year">
        你的{speciesName}在第 {year} 年結束了生命
        {state.year < state.maxYear && `，距離末日還有 ${state.maxYear - state.year} 年`}
      </div>
      <div className="death-stats">
        戰鬥 {state.runStats.fightsWon} 勝 {state.runStats.fightsLost} 敗｜最大族群 {state.runStats.maxPack}｜知識 {state.knowledge}
      </div>
      <div className="death-tip">💡 {tip}</div>
      <button className="report-btn" onClick={() => setShowReport(true)}>下一頁：生涯報告 →</button>
      <button className="restart-btn" onClick={onRestart}>
        重新開始
      </button>
      {showReport && <ReportOverlay state={state} onClose={() => setShowReport(false)} />}
    </div>
  );
}
