interface BrandLogoProps {
  variant?: 'mark' | 'lockup';
  className?: string;
  darkSurface?: boolean;
}

export default function BrandLogo({ variant = 'mark', className, darkSurface = true }: BrandLogoProps) {
  const src = variant === 'mark'
    ? '/branding/logo-mark.svg'
    : darkSurface ? '/branding/logo-lockup.svg' : '/branding/logo-lockup-dark.svg';

  return <img src={src} alt="LedgerX" className={className} />;
}
