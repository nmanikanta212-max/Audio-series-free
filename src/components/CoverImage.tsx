import { Headphones } from 'lucide-react';
import { useEffect, useState } from 'react';

interface CoverImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function CoverImage({ src, alt, className = '' }: CoverImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-800 via-stone-900 to-orange-950/60 p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Headphones className="mb-2 h-8 w-8 text-orange-400/80" />
        <span className="line-clamp-2 text-xs font-medium text-stone-200">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
