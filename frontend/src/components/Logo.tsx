import { useState } from 'react';

interface LogoProps {
  className?: string;
  alt?: string;
}

export default function Logo({ className = '', alt = 'PrestaCI' }: LogoProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <span className={`font-bold text-xl tracking-tight ${className}`}>
        {alt}
      </span>
    );
  }

  return (
    <img
      src="/presta-ci-logo.png"
      alt={alt}
      className={`object-contain ${className}`}
      onError={() => setHasError(true)}
      loading="lazy"
    />
  );
}
