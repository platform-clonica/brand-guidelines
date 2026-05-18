import { DownloadButton } from '@/components/ui/DownloadButton';

type Props = {
  src: string;
  fileName: string;
  bg: 'light' | 'dark';
  caption: string;
  downloadLabel: string;
  shape?: 'wide' | 'square';
};

export function LogoStage({ src, fileName, bg, caption, downloadLabel, shape = 'wide' }: Props) {
  const isDark = bg === 'dark';
  const isSquare = shape === 'square';
  return (
    <figure className="flex flex-col gap-4">
      <div
        className={`flex items-center justify-center ${
          isDark ? 'bg-dark' : 'bg-warm-light ring-1 ring-dark/5'
        } ${isSquare ? 'aspect-square px-8' : 'aspect-[21/9] px-12'}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={caption}
          className={`w-full h-auto ${isSquare ? 'max-w-[60%]' : 'max-w-[560px]'}`}
        />
      </div>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-4">
        <span className="font-mono text-caption uppercase tracking-[0.04em] text-dark/60">
          {caption}
        </span>
        <DownloadButton href={src} fileName={fileName}>
          {downloadLabel}
        </DownloadButton>
      </figcaption>
    </figure>
  );
}
