interface Props {
  narrative: string;
  year: number;
}

export default function EventNarrative({ narrative, year }: Props) {
  return (
    <div className="card event-narrative fade-in">
      <div className="event-title">第 {year} 年事件</div>
      {narrative}
    </div>
  );
}
