'use client';
import { useState } from 'react';
import { compileDeck } from '@/lib/deck';
import type { DeckType } from '@/lib/deck';
import { DeckRenderer } from './DeckRenderer';
import { ToneReport } from './ToneReport';

const SAMPLE = `# Propuesta de colaboración
Diagnóstico de criterios y arquitectura de decisión para el ecommerce de la marca.
> cliente: Naturgy
![Portada · universo visual](/universo/universo-02.jpg)

---

EL RETO
# Incrementar la conversión sin añadir más capas al proceso de compra

---

## El espacio del Entre
![Universo visual](/universo/universo-01.jpg)
La marca trabaja en la transición: el momento de ambigüedad y pausa donde una decisión todavía puede cambiar de dirección. Cada proyecto empieza por leer ese espacio antes de proponer nada.

---

## ¿Cómo lo haremos?
- Auditoría heurística del recorrido completo, evaluado en los dos momentos que deciden la compra
- Pruebas con usuarios reales para separar la fricción percibida de la que cuesta dinero
- Backlog de oportunidades ordenado por criterio, no por volumen de hallazgos

---

## Enfoque
### Tipología
Mystery shopping aplicado a canal online, con enfoque mixto cuantitativo y cualitativo.
### Unidad de análisis
El pedido completo, evaluado en dos momentos: seguimiento logístico y unboxing.
### Momentos
Cuatro semanas de compras por persona, con recepción y evaluación de cada pedido.

---

## Roadmap
\`\`\`gantt
semanas: 8
Diagnóstico: 1
Discovery: 2-3
Volumetría: 4-8
hitos cliente: 1, 3, 5, 8
\`\`\`

---

# Gracias
www.interactius.com
`;

const TYPES: { id: DeckType; label: string }[] = [
  { id: 'comercial', label: 'Comercial' },
  { id: 'informe', label: 'Informe' },
  { id: 'generica', label: 'Genérica' },
];

const btn: React.CSSProperties = {
  appearance: 'none', border: '1px solid #1C1A17', background: '#1C1A17', color: '#F5F2ED',
  font: '500 12px/1 var(--font-ibm-plex-mono, monospace)', letterSpacing: '.04em', padding: '10px 14px', cursor: 'pointer',
};
const seg: React.CSSProperties = {
  flex: 1, padding: '7px 6px', border: '1px solid #E0DAD2', background: 'transparent', color: '#75706B',
  font: '500 10px/1 var(--font-ibm-plex-mono, monospace)', letterSpacing: '.06em', textTransform: 'uppercase', cursor: 'pointer',
};
const segOn: React.CSSProperties = { background: '#1C1A17', color: '#F5F2ED', borderColor: '#1C1A17' };

export function DeckStudio() {
  const [md, setMd] = useState(SAMPLE);
  const [type, setType] = useState<DeckType>('comercial');
  const [deck, setDeck] = useState(() => compileDeck(SAMPLE, 'comercial'));

  const pickType = (t: DeckType) => { setType(t); setDeck(compileDeck(md, t)); };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F2ED' }}>
      <aside
        className="studio-controls"
        style={{ width: 380, flexShrink: 0, padding: 20, overflowY: 'auto', borderRight: '1px solid #E0DAD2', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div style={{ font: '500 11px/1.4 var(--font-ibm-plex-mono, monospace)', letterSpacing: '.14em', textTransform: 'uppercase', color: '#75706B' }}>
          Presentaciones · contenido
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPES.map((t) => (
            <button key={t.id} onClick={() => pickType(t.id)} style={{ ...seg, ...(type === t.id ? segOn : {}) }}>
              {t.label}
            </button>
          ))}
        </div>
        <textarea
          value={md}
          onChange={(e) => setMd(e.target.value)}
          aria-label="Contenido markdown de la presentación"
          spellCheck={false}
          style={{ flex: 1, minHeight: 280, resize: 'vertical', padding: 12, border: '1px solid #E0DAD2', background: '#fff', font: '400 12px/1.5 var(--font-ibm-plex-mono, monospace)', color: '#1C1A17' }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btn} onClick={() => setDeck(compileDeck(md, type))}>Generar</button>
          <button style={{ ...btn, background: 'transparent', color: '#1C1A17' }} onClick={() => window.print()}>Descargar PDF</button>
        </div>
        <ToneReport text={md} />
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        <DeckRenderer deck={deck} />
      </div>
    </div>
  );
}
