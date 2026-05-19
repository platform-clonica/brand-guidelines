'use client';

import { CopyButton } from '@/components/ui/CopyButton';
import type { ColorToken } from '@/lib/tokens';

type Props = { token: ColorToken; isBorderless?: boolean };

export function ColorSwatch({ token, isBorderless }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <CopyButton
        value={token.hex}
        label={`${token.name} ${token.hex}`}
        className={`block aspect-[5/4] w-full cursor-pointer ${isBorderless ? '' : 'ring-1 ring-dark/10'}`}
      >
        <span aria-hidden className="block w-full h-full" style={{ background: token.hex }} />
      </CopyButton>
      <div className="flex flex-col gap-1.5 font-mono">
        <div className="text-body-sm text-dark">{token.name}</div>
        <CopyButton
          value={token.hex}
          className="text-caption uppercase tracking-[0.04em] text-dark/70 text-left hover:text-dark transition-colors duration-200 ease-expo"
        >
          {token.hex}
        </CopyButton>
        <CopyButton
          value={`rgb(${token.rgb})`}
          className="text-caption uppercase tracking-[0.04em] text-dark/50 text-left hover:text-dark transition-colors duration-200 ease-expo"
        >
          RGB {token.rgb}
        </CopyButton>
        <CopyButton
          value={`cmyk(${token.cmyk})`}
          className="text-caption uppercase tracking-[0.04em] text-dark/50 text-left hover:text-dark transition-colors duration-200 ease-expo"
        >
          CMYK {token.cmyk}
        </CopyButton>
      </div>
    </div>
  );
}
