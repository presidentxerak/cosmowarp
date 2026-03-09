import { useTheme } from '../context/ThemeContext';

interface LogoProps {
  className?: string;
  onClick?: () => void;
}

export default function Logo({ className = 'w-8 h-8', onClick }: LogoProps) {
  const { theme } = useTheme();
  const src = import.meta.env.BASE_URL + (theme === 'dark' ? 'cosmorare-logo-white.svg' : 'cosmorare-logo-black.svg');
  return <img src={src} alt="Cosmorare" className={className} onClick={onClick} />;
}
