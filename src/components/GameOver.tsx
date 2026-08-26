interface Props {
  cause: string;
  year: number;
  speciesName: string;
  onRestart: () => void;
}

export default function GameOver({ cause, year, speciesName, onRestart }: Props) {
  return (
    <div className="game-over-screen fade-in">
      <div className="skull">💀</div>
      <h2>遊戲結束</h2>
      <div className="death-cause">{cause}</div>
      <div className="death-year">
        你的{speciesName}在第 {year} 年結束了生命
      </div>
      <button className="restart-btn" onClick={onRestart}>
        重新開始
      </button>
    </div>
  );
}
