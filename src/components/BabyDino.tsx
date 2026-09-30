// 孵化畫面用的小恐龍寶寶：同一個圓滾滾的身形，依物種換顏色與特徵

interface Look { body: string; belly: string; dark: string; }

const LOOKS: Record<string, Look> = {
  trex: { body: '#8fb04a', belly: '#e6ecc0', dark: '#5f7a2e' },
  velociraptor: { body: '#a98bc2', belly: '#efe4f5', dark: '#6f5689' },
  triceratops: { body: '#7fa05a', belly: '#e3ecc6', dark: '#56713a' },
  parasaurolophus: { body: '#d49a58', belly: '#f7e6cc', dark: '#9b6832' },
  therizinosaurus: { body: '#b39373', belly: '#f1e5d6', dark: '#7d634a' },
  struthiomimus: { body: '#d9b36e', belly: '#f8ecd2', dark: '#a07e3f' },
  chicken: { body: '#f7f3ea', belly: '#ffffff', dark: '#c9bfae' },
};

export default function BabyDino({ id }: { id: string }) {
  const c = LOOKS[id] ?? LOOKS.trex;
  const stroke = '#3b2e25';
  return (
    <svg viewBox="0 0 170 150" className="baby-dino" aria-hidden="true">
      <g stroke={stroke} strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
        {/* 背後的特徵 */}
        {id === 'triceratops' && <path d="M68 40 Q96 2 132 26 Q140 44 128 60 L78 66Z" fill="#e2d2a4" />}
        {id === 'parasaurolophus' && <path d="M84 36 Q70 10 40 16 Q34 24 46 28 Q66 26 76 48Z" fill={c.dark} />}

        {/* 尾巴 */}
        <path d="M44 108 Q14 110 6 94 Q24 102 48 92Z" fill={c.body} />
        {/* 身體 */}
        <ellipse cx="74" cy="104" rx="40" ry="32" fill={c.body} />
        <ellipse cx="82" cy="110" rx="22" ry="20" fill={c.belly} stroke="none" />
        {/* 腳 */}
        <path d="M52 128 q-2 14 12 12 q10 0 8 -10" fill={c.body} />
        <path d="M86 130 q-2 12 12 10 q10 0 8 -10" fill={c.body} />
        {/* 手 */}
        {id === 'therizinosaurus' ? (
          <path d="M104 100 q14 2 16 12 M112 104 l10 14 M106 108 l8 16 M114 101 l14 10" fill="none" />
        ) : (
          <path d="M104 100 q10 2 12 10" fill="none" />
        )}

        {/* 頭 */}
        <path d={id === 'chicken' || id === 'struthiomimus'
          ? 'M70 60 Q70 22 104 20 Q136 20 138 52 Q140 76 112 80 Q80 84 70 60Z'
          : 'M66 62 Q64 20 104 18 Q140 18 150 48 Q156 70 128 76 Q88 86 66 62Z'} fill={c.body} />

        {/* 物種特徵 */}
        {id === 'triceratops' && <>
          <path d="M112 24 L118 4 L124 24Z" fill="#f5ecd4" />
          <path d="M128 30 L140 12 L140 34Z" fill="#f5ecd4" />
          <path d="M146 44 L156 36 L152 50Z" fill="#f5ecd4" />
        </>}
        {id === 'velociraptor' && <path d="M92 22 Q86 6 96 4 Q98 14 104 18 Q108 4 116 8 Q110 16 108 22Z" fill={c.dark} />}
        {id === 'chicken' && <>
          <path d="M94 24 Q92 8 102 10 Q104 2 112 6 Q120 2 120 14 Q126 16 120 24Z" fill="#e0453a" />
          <path d="M136 46 L156 52 L136 60Z" fill="#f2b632" />
          <path d="M132 62 Q138 76 128 76 Q124 68 128 62Z" fill="#e0453a" />
        </>}
        {id === 'struthiomimus' && <path d="M136 46 L154 52 L136 58Z" fill={c.dark} />}
        {id === 'trex' && <path d="M84 30 l6 -6 l6 6 l6 -6 l6 6" fill="none" stroke={c.dark} />}
      </g>

      {/* 臉 */}
      <circle cx="112" cy="44" r="10" fill="#fff" stroke={stroke} strokeWidth="3" />
      <circle cx="115" cy="46" r="6" fill={stroke} />
      <circle cx="117" cy="43" r="2.2" fill="#fff" />
      <ellipse cx="102" cy="62" rx="7" ry="4" fill="#f29a9a" opacity="0.8" />
      {id !== 'chicken' && id !== 'struthiomimus' && (
        <path d="M130 64 q6 5 12 0" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" />
      )}
      <circle cx="146" cy="52" r="1.8" fill={stroke} opacity={id === 'chicken' || id === 'struthiomimus' ? 0 : 1} />
    </svg>
  );
}
