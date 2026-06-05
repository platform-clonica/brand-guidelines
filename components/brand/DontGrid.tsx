type DontItem = { num: string; description: string };

type Props = { items: DontItem[] };

const SAMPLES: Record<string, React.ReactNode> = {
  '01': (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/logo/interactius-positivo.svg" alt="" aria-hidden
         className="block w-full max-w-[180px] h-auto"
         style={{ filter: 'hue-rotate(180deg) saturate(2)' }} />
  ),
  '02': (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/interactius-positivo.svg" alt="" aria-hidden className="block w-full max-w-[180px] h-auto" />
      <span className="absolute -top-2 -right-4 font-mono text-caption text-dark/70">Actitud liminal</span>
    </div>
  ),
  '03': (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/logo/interactius-positivo.svg" alt="" aria-hidden
         className="block w-full max-w-[180px] h-auto"
         style={{ transform: 'scaleX(0.55)' }} />
  ),
  '04': (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/logo/interactius-positivo.svg" alt="" aria-hidden
         className="block w-full max-w-[180px] h-auto"
         style={{ filter: 'drop-shadow(2px 3px 0 rgba(0,0,0,0.35))' }} />
  ),
  '05': (
    <div
      className="relative w-full max-w-[200px] aspect-[16/9] flex items-center justify-center bg-cover bg-center"
      style={{ backgroundImage: "url('/universo/universo-02.jpg')" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/interactius-positivo.svg" alt="" aria-hidden className="w-[80%] h-auto opacity-90" />
    </div>
  ),
  '06': (
    <div className="font-mono text-[clamp(12px,calc(7vw-13px),26px)] leading-none whitespace-nowrap">
      <span>inter</span>
      <span className="text-bordeaux">act</span>
      <span>īus</span>
    </div>
  ),
  '07': (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img src="/logo/interactius-positivo.svg" alt="" aria-hidden
         className="block w-full max-w-[160px] h-auto"
         style={{ transform: 'rotate(-12deg)' }} />
  ),
  '08': (
    <div className="overflow-hidden w-full max-w-[180px] h-[34px] flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo/interactius-positivo.svg" alt="" aria-hidden className="block w-[260px] h-auto -translate-x-6" />
    </div>
  ),
};

export function DontGrid({ items }: Props) {
  return (
    <ul className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
      {items.map((item) => (
        <li key={item.num} className="flex flex-col gap-3">
          <div className="aspect-[4/3] bg-pure-white flex items-center justify-center p-6 relative">
            <span className="absolute top-2 left-3 font-mono text-caption text-dark/40">
              {item.num}
            </span>
            {SAMPLES[item.num]}
          </div>
          <p className="font-mono text-caption text-dark/70 leading-snug">{item.description}</p>
        </li>
      ))}
    </ul>
  );
}
