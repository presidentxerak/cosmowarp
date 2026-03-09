/**
 * Hexagonal profile avatar with procedurally generated face.
 * Each address gets a unique color and facial expression.
 * Supports custom uploaded profile images.
 */
import { useState, useEffect } from 'react';
import { SocialEngine } from '../engine/social';

interface HexAvatarProps {
  address: string;
  size?: number;
  className?: string;
  onClick?: () => void;
  animate?: boolean;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Monochrome grayscale palettes
const PALETTES = [
  { bg: '#1a1a1a', face: '#cccccc', accent: '#666666' },
  { bg: '#0d0d0d', face: '#b3b3b3', accent: '#555555' },
  { bg: '#222222', face: '#d9d9d9', accent: '#777777' },
  { bg: '#111111', face: '#c0c0c0', accent: '#4d4d4d' },
  { bg: '#2a2a2a', face: '#e0e0e0', accent: '#888888' },
  { bg: '#181818', face: '#aaaaaa', accent: '#5a5a5a' },
  { bg: '#1f1f1f', face: '#d4d4d4', accent: '#707070' },
  { bg: '#141414', face: '#c7c7c7', accent: '#606060' },
  { bg: '#262626', face: '#dedede', accent: '#808080' },
  { bg: '#0f0f0f', face: '#b8b8b8', accent: '#505050' },
  { bg: '#232323', face: '#dbdbdb', accent: '#757575' },
  { bg: '#171717', face: '#a5a5a5', accent: '#585858' },
];

function getAvatarColors(address: string): { bg: string; face: string; accent: string } {
  const h = hashCode(address);
  return PALETTES[h % PALETTES.length];
}

export default function HexAvatar({ address, size = 40, className = '', onClick, animate = false }: HexAvatarProps) {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const social = SocialEngine.load();
    const profile = social.getProfile(address);
    if (profile?.profileImage) {
      setProfileImage(profile.profileImage);
    }
  }, [address]);

  const colors = getAvatarColors(address);
  const h = hashCode(address);

  // Procedural face variations based on address
  const eyeSpacing = 6 + (h % 3);
  const eyeY = 18 + (h % 3);
  const eyeSize = 2 + ((h >> 4) % 2);
  const mouthY = 27 + (h % 3);
  const mouthWidth = 5 + ((h >> 8) % 4);
  const mouthCurve = ((h >> 12) % 3) - 1;
  const hasBlush = (h >> 16) % 3 === 0;

  // Mouth path
  const mouthX = 20;
  let mouthPath: string;
  if (mouthCurve > 0) {
    mouthPath = `M${mouthX - mouthWidth} ${mouthY} Q${mouthX} ${mouthY + 4} ${mouthX + mouthWidth} ${mouthY}`;
  } else if (mouthCurve < 0) {
    mouthPath = `M${mouthX - mouthWidth} ${mouthY + 2} Q${mouthX} ${mouthY - 1} ${mouthX + mouthWidth} ${mouthY + 2}`;
  } else {
    mouthPath = `M${mouthX - mouthWidth} ${mouthY} L${mouthX + mouthWidth} ${mouthY}`;
  }

  const animClass = animate ? 'hex-avatar-animate' : '';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={`${className} ${onClick ? 'cursor-pointer' : ''} ${animClass}`}
      onClick={onClick}
      style={{ display: 'block' }}
    >
      <defs>
        <clipPath id={`hex-clip-${address.slice(0, 8)}`}>
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
        </clipPath>
      </defs>

      {profileImage ? (
        <>
          {/* Custom profile image inside hexagon */}
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill={colors.bg}
            stroke={colors.accent}
            strokeWidth="1.5"
          />
          <image
            href={profileImage}
            x="4" y="2" width="32" height="36"
            clipPath={`url(#hex-clip-${address.slice(0, 8)})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            fill="none"
            stroke={colors.accent}
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
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
        </>
      )}
    </svg>
  );
}
