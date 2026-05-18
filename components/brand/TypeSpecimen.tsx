type Props = {
  family: string;
  role: string;
  description: string;
  weightsNote: string;
  fontClass: 'font-mono' | 'font-serif';
  downloadHref: string;
  downloadLabel: string;
};

const ALPHABET_LINES = [
  'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj',
  'Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt',
  'Uu Vv Ww Xx Yy Zz 0123456789',
];

export function TypeSpecimen({ family, role, description, weightsNote, fontClass, downloadHref, downloadLabel }: Props) {
  return (
    <article className="flex flex-col gap-8 items-start">
      <div className="flex flex-col gap-4 items-start max-w-[720px]">
        <span className="font-mono text-caption uppercase tracking-[0.08em] text-dark/60">
          {role}
        </span>
        <h3 className={`${fontClass} text-title-sm leading-tight`}>{family}</h3>
        <p className="font-mono text-body-sm text-dark leading-[1.7]">
          {description.split(family).map((chunk, i, arr) => (
            <span key={i}>
              {chunk}
              {i < arr.length - 1 && (
                <strong className="font-semibold">{family}</strong>
              )}
            </span>
          ))}
        </p>
        <p className="font-mono text-caption text-dark/50 mt-1">{weightsNote}</p>
      </div>
      <div className={`${fontClass} text-[clamp(1.5rem,1rem+2vw,2.5rem)] leading-[1.4] tracking-tight`}>
        {ALPHABET_LINES.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
      <a
        href={downloadHref}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-3 font-mono text-body-sm text-dark"
      >
        <span aria-hidden className="opacity-60 transition-opacity duration-500 ease-expo group-hover:opacity-100">↓</span>
        <span className="hover-wipe-underline">{downloadLabel}</span>
      </a>
    </article>
  );
}
