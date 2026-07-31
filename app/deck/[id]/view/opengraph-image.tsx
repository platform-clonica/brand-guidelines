import { ImageResponse } from 'next/og';
import { getDeckShareMeta } from '@/lib/decks/shareMeta';
import { SERIF_300_B64, MONO_400_B64, INTERACTIUS_SVG_B64 } from '@/lib/decks/ogAssets';

/* Social preview image for a shared deck link: the presentation's OWN cover, recreated.
   This is a second rendering of the cover design (the first is components/deck/layouts/Cover.tsx
   + the `.cover` rules in deck.css) — satori can't run our React/CSS, so the layout below mirrors
   those values by hand. If the cover design changes, change it here too, or the preview drifts.
   Deliberately simpler than the real cover: background photo + scrim + Interactius wordmark +
   the big serif title (+ the cover subtitle). The CLIENT is not drawn here — it rides in the OG
   description text ("Propuesta de colaboración para {Cliente}") instead. The title has no FitText
   shrink; it wraps.

   Assets (fonts + wordmark) are inlined as base64 (lib/decks/ogAssets.ts): reading them from disk
   500s on Netlify because the serverless bundle doesn't trace those files. Zero fs reads here. */

export const runtime = 'nodejs';
export const alt = 'Portada de la presentación';
export const size = { width: 1280, height: 720 };
// JPEG, not PNG: next/og only emits PNG, and a 1280×720 PNG with a real background photo weighs
// ~1.9 MB — over WhatsApp's link-preview size limit (~600 KB), so WhatsApp shows title+description
// but no image. We re-encode the PNG to JPEG (~190 KB) below. `contentType` sets og:image:type.
export const contentType = 'image/jpeg';

// Cover tokens, mirrored from deck.css (:root + .cover). Canvas is the deck's fixed 1280×720.
const DARK = '#1C1A17';
const WARM = '#F5F2ED';
const SHORT_TITLE = 40; // Cover.tsx measure step

const serif300 = Buffer.from(SERIF_300_B64, 'base64');
const mono400 = Buffer.from(MONO_400_B64, 'base64');
const interactiusUri = `data:image/svg+xml;base64,${INTERACTIUS_SVG_B64}`;

/* La foto de portada se baja AQUÍ y se le pasa a satori ya como data URI, en vez de dejar que la
   descargue él por su cuenta. Dos motivos, los dos vistos en producción (2026-07-31):
   - Sin control: si la descarga tardaba o fallaba, reventaba el render ENTERO y la preview salía
     como un rectángulo negro. Ahora una foto que no baja solo cuesta la foto — el titular, el
     logotipo y el degradado se siguen dibujando, que es una preview perfectamente presentable.
   - Sin límite de tiempo: la descarga podía colgarse hasta agotar la función. Aquí son 8s y fuera. */
const IMAGE_TIMEOUT_MS = 8000;

async function coverAsDataUri(src: string | null): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith('data:')) return src;          // ya viene incrustada en el markdown
  if (!/^https?:\/\//i.test(src)) return null;      // ruta relativa: satori no sabe resolverla
  try {
    const res = await fetch(src, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    // satori no decodifica webp ni avif: mejor sin foto que con el render roto.
    if (!/^image\/(jpeg|png|gif|svg\+xml)/i.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:${type};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await Promise.resolve(params);

  try {
    const meta = await getDeckShareMeta(id).catch(() => null);
    /* El titular puede traer saltos explícitos (`\` en el markdown). Aquí se aplanan: esta portada
       la redibuja satori y hace su propio wrap, así que un <br> no aporta y complica la medida. */
    const title = meta?.title?.replace(/\s*\n\s*/g, ' ').trim() || 'Presentación';
    const subtitle = meta?.subtitle?.trim() || null;
    const long = title.length > SHORT_TITLE;
    const photo = await coverAsDataUri(meta?.imageSrc ?? null);

    const png = new ImageResponse(
      (
        <div style={{ position: 'relative', display: 'flex', width: '100%', height: '100%', backgroundColor: DARK }}>
          {/* Background photo */}
          {photo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt="" width={1280} height={720} style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 720, objectFit: 'cover' }} />
          )}
          {/* Scrim — two stacked gradients (deck.css .cover .scrim) */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'linear-gradient(to top right, rgba(28,26,23,0.92), rgba(28,26,23,0.10) 62%)' }} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', backgroundImage: 'linear-gradient(to top, rgba(28,26,23,0.55), rgba(28,26,23,0) 38%)' }} />

          {/* Content layer: wordmark pinned top, title lockup pinned bottom, inset --ml/--mb (108/56).
              Explicit 1280×720 + space-between so satori reserves height for a wrapped title. */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 1280, height: 720, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '56px 108px' }}>
            {/* Interactius wordmark, top-left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={interactiusUri} alt="interactius" height={28} width={217} style={{ height: 28, width: 217 }} />

            {/* Bottom-left lockup: big title (+ cover subtitle) */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 24, width: long ? 820 : 700 }}>
              <div style={{ display: 'flex', fontFamily: 'Serif', fontWeight: 300, fontSize: 64, lineHeight: 1.06, letterSpacing: -0.64, color: WARM }}>{title}</div>
              {subtitle && (
                <div style={{ display: 'flex', fontFamily: 'Mono', fontWeight: 400, fontSize: 13, lineHeight: 1.6, color: WARM, opacity: 0.72, maxWidth: 440 }}>{subtitle}</div>
              )}
            </div>
          </div>
        </div>
      ),
      {
        ...size,
        fonts: [
          { name: 'Serif', data: serif300, weight: 300, style: 'normal' },
          { name: 'Mono', data: mono400, weight: 400, style: 'normal' },
        ],
      },
    );

    // Re-encode PNG → JPEG to get under WhatsApp's preview size limit. sharp is loaded lazily so a
    // (very unlikely) bundling failure degrades to the PNG instead of 500ing the whole route.
    const pngBuf = Buffer.from(await png.arrayBuffer());
    try {
      const sharp = (await import('sharp')).default;
      const jpeg = await sharp(pngBuf).jpeg({ quality: 80 }).toBuffer();
      return new Response(new Uint8Array(jpeg), {
        headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=300' },
      });
    } catch {
      return new Response(new Uint8Array(pngBuf), {
        headers: { 'content-type': 'image/png', 'cache-control': 'public, max-age=300' },
      });
    }
  } catch {
    /* Nunca romper la preview del cliente: lienzo oscuro (sin texto → sin fuente, sin fs).
       Y SOBRE TODO, sin cachear. Este era el fallo real de 2026-07-31: un `ImageResponse` pelado
       hereda el `cache-control: public, immutable, max-age=31536000` que Next pone por defecto a
       las imágenes OG, así que un fallo transitorio —un arranque en frío, una descarga lenta— se
       quedaba congelado en el CDN UN AÑO. Un deck salía sin miniatura para siempre y otro idéntico
       funcionaba, según a cuál le hubiera tocado fallar la primera vez.
       `no-store` hace que el siguiente que pida la imagen la reintente. */
    const fallback = new ImageResponse(
      <div style={{ display: 'flex', width: '100%', height: '100%', backgroundColor: DARK }} />, size,
    );
    return new Response(fallback.body, {
      status: 200,
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store, max-age=0' },
    });
  }
}
