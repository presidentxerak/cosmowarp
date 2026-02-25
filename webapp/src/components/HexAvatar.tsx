/**
 * Hexagonal profile avatar with procedurally generated face.
 * Each address gets a unique color and facial expression.
 */

interface HexAvatarProps {
  address: string;
  size?: number;
  className?: string;
  onClick?: () => void;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getAvatarColors(address: string): { bg: string; face: string; accent: string } {
  const h = hashCode(address);
  const hue = h % 360;
  const sat = 50 + (h % 30);
  const light = 25 + (h % 15);
  return {
    bg: `hsl(${hue}, ${sat}%, ${light}%)`,
    face: `hsl(${hue}, ${sat - 10}%, ${light + 40}%)`,
    accent: `hsl(${(hue + 120) % 360}, ${sat}%, ${light + 30}%)`,
  };
}

export default function HexAvatar({ address, size = 40, className = '', onClick }: HexAvatarProps) {
  const colors = getAvatarColors(address);
  const h = hashCode(address);

  // Procedural face variations based on address
  const eyeSpacing = 6 + (h % 3);           // 6-8
  const eyeY = 18 + (h % 3);                // 18-20
  const eyeSize = 2 + ((h >> 4) % 2);       // 2-3
  const mouthY = 27 + (h % 3);              // 27-29
  const mouthWidth = 5 + ((h >> 8) % 4);    // 5-8
  const mouthCurve = ((h >> 12) % 3) - 1;   // -1, 0, 1 (frown, neutral, smile)
  const hasBlush = (h >> 16) % 3 === 0;

  // Mouth path
  const mouthX = 20;
  let mouthPath: string;
  if (mouthCurve > 0) {
    // Smile
    mouthPath = `M${mouthX - mouthWidth} ${mouthY} Q${mouthX} ${mouthY + 4} ${mouthX + mouthWidth} ${mouthY}`;
  } else if (mouthCurve < 0) {
    // Slight frown
    mouthPath = `M${mouthX - mouthWidth} ${mouthY + 2} Q${mouthX} ${mouthY - 1} ${mouthX + mouthWidth} ${mouthY + 2}`;
  } else {
    // Neutral
    mouthPath = `M${mouthX - mouthWidth} ${mouthY} L${mouthX + mouthWidth} ${mouthY}`;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
      style={{ display: 'block' }}
    >
      {/* Hexagon shape */}
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill={colors.bg}
        stroke={colors.accent}
        strokeWidth="1.5"
      />

      {/* Eyes */}
      <circle cx={20 - eyeSpacing} cy={eyeY} r={eyeSize} fill={colors.face} />
      <circle cx={20 + eyeSpacing} cy={eyeY} r={eyeSize} fill={colors.face} />

      {/* Pupils */}
      <circle cx={20 - eyeSpacing} cy={eyeY} r={eyeSize * 0.5} fill={colors.bg} />
      <circle cx={20 + eyeSpacing} cy={eyeY} r={eyeSize * 0.5} fill={colors.bg} />

      {/* Mouth */}
      <path
        d={mouthPath}
        fill="none"
        stroke={colors.face}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Blush (optional) */}
      {hasBlush && (
        <>
          <circle cx={20 - eyeSpacing - 3} cy={eyeY + 4} r="2.5" fill={colors.accent} opacity="0.3" />
          <circle cx={20 + eyeSpacing + 3} cy={eyeY + 4} r="2.5" fill={colors.accent} opacity="0.3" />
        </>
      )}
    </svg>
  );
}
