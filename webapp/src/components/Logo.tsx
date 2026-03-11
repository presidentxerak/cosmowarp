import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export default function Logo({ className = 'w-8 h-8', onClick }: LogoProps) {
  const { theme } = useTheme();
  const src = import.meta.env.BASE_URL + (theme === 'dark' ? 'strangrz-logo-white.svg' : 'strangrz-logo-black.svg');
  return <img src={src} alt="STRANGRZ" className={className} onClick={onClick} />;
}
