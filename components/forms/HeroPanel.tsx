/* Hero column (60%). Background image (or dark brand fallback) with the client logo overlaid,
   plus the subordinate "by Interactius" signature next to it (per product decision).
   The client logo does NOT replace the Interactius signature. */

import type { FormDraft } from '@/lib/forms/schema';

export function HeroPanel({ def }: { def: FormDraft }) {
  const hasBg = Boolean(def.background);
  return (
    <div
      className={`ixf-hero${hasBg ? '' : ' ixf-hero--plain'}`}
      style={hasBg ? { backgroundImage: `url(${JSON.stringify(def.background).slice(1, -1)})` } : undefined}
    >
      <div className="ixf-hero__brandbar">
        {def.logo ? (
          // Client logo is an arbitrary repo/URL asset; plain <img> (not next/image) keeps it simple.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="ixf-hero__logo" src={def.logo} alt={def.client ? `${def.client}` : 'Logo'} />
        ) : null}
        <span className="ixf-signature">
          by <strong>interactīus</strong>
        </span>
      </div>
    </div>
  );
}
