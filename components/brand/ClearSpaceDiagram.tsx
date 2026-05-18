export function ClearSpaceDiagram() {
  return (
    <div className="relative w-full bg-warm-light ring-1 ring-dark/5 px-8 py-16 sm:px-16 sm:py-24 flex items-center justify-center">
      <div className="relative">
        {/* Frame outline */}
        <div className="absolute -inset-x-[12%] -inset-y-[60%] ring-1 ring-dashed ring-dark/25" />

        {/* corner "a" marks */}
        <span className="absolute -top-[42%] -left-[6%] font-mono text-[18px] text-dark/35">a</span>
        <span className="absolute -top-[42%] -right-[6%] font-mono text-[18px] text-dark/35">a</span>
        <span className="absolute -bottom-[42%] -left-[6%] font-mono text-[18px] text-dark/35">a</span>
        <span className="absolute -bottom-[42%] -right-[6%] font-mono text-[18px] text-dark/35">a</span>

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo/interactius-positivo.svg"
          alt="interactīus"
          className="block w-full max-w-[420px] h-auto"
        />
      </div>
    </div>
  );
}
