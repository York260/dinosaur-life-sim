interface Props {
  label: string;
  value: number;
  max: number;
  type: 'hp' | 'hunger' | 'hydration';
}

export default function StatusBar({ label, value, max, type }: Props) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const isWarning = value < 20;

  return (
    <>
      <div className="status-row">
        <span className="status-label">{label}</span>
        <div className="bar-container">
          <div
            className={`bar-fill ${type}`}
            style={{ width: `${pct}%` }}
          />
          <span className="bar-text">{value}/{max}</span>
        </div>
      </div>
      {isWarning && (
        <div className="status-warning">
          {type === 'hp' ? '!! 生命危急 !!' : type === 'hunger' ? '!! 飢餓警告 !!' : '!! 脫水警告 !!'}
        </div>
      )}
    </>
  );
}
