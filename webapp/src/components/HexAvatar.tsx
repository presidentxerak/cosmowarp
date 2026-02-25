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

// App-themed color palettes (purples, cyans, pinks, blues - no green/brown)
const PALETTES = [
  { bg: '#2d1b69', face: '#c084fc', accent: '#a855f7' },  // Deep purple
  { bg: '#1e1b4b', face: '#818cf8', accent: '#6366f1' },  // Indigo
  { bg: '#312e81', face: '#a78bfa', accent: '#8b5cf6' },  // Violet
  { bg: '#1e3a5f', face: '#67e8f9', accent: '#22d3ee' },  // Cyan
  { bg: '#4a1942', face: '#f472b6', accent: '#ec4899' },  // Pink
  { bg: '#3b0764', face: '#d8b4fe', accent: '#c084fc' },  // Light purple
  { bg: '#172554', face: '#93c5fd', accent: '#3b82f6' },  // Blue
  { bg: '#581c87', face: '#e9d5ff', accent: '#a855f7' },  // Lavender
  { bg: '#134e4a', face: '#5eead4', accent: '#14b8a6' },  // Teal
  { bg: '#4c1d95', face: '#c4b5fd', accent: '#7c3aed' },  // Purple
  { bg: '#1e1b4b', face: '#fda4af', accent: '#fb7185' },  // Rose
  { bg: '#0c4a6e', face: '#7dd3fc', accent: '#0ea5e9' },  // Sky blue
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
