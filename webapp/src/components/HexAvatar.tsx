/**
 * Hexagonal profile avatar.
 * Uses one of 7 random default profile icons based on address hash.
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

const PROFILE_ICON_COUNT = 7;

/** Get deterministic random icon (1-7) based on address */
function getDefaultIcon(address: string): string {
  const h = hashCode(address);
  const num = (h % PROFILE_ICON_COUNT) + 1;
  return `${import.meta.env.BASE_URL}icon-profile-random-${num}.png`;
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

  const imgSrc = profileImage || getDefaultIcon(address);
  const animClass = animate ? 'hex-avatar-animate' : '';
  const clipId = `hex-clip-${address.slice(0, 8)}`;

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
        <clipPath id={clipId}>
          <polygon points="20,2 36,11 36,29 20,38 4,29 4,11" />
        </clipPath>
      </defs>

      {/* Background fill */}
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill="#111111"
      />

      {/* Profile image (custom or default random icon) */}
      <image
        href={imgSrc}
        x="4" y="2" width="32" height="36"
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />

      {/* Hexagon border */}
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="1.5"
      />
    </svg>
  );
}
