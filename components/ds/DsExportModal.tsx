'use client';
import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors } from '@/components/deck/studio/ui';
import { getDesignSystem } from '@/lib/ds/api';
import { compileSystem } from '@/lib/ds/compile';
import { exportFile, type ExportFormat } from '@/lib/ds/gallery';
import type { DesignSystemListItem, DesignSystemRecord } from '@/lib/ds/types';
import { downloadFile } from './download';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'json', label: 'tokens.json' },
  { format: 'css', label: 'tokens.css' },
  { format: 'styleguide', label: 'styleguide.html' },
];

/* Exportar desde la galería. El listado no trae los tokens (pesan decenas de KB por fila), así que se
   pide la fila al abrir. Lo que se descarga sale de los tokens GUARDADOS: ver lib/ds/gallery.ts.

   El styleguide pinta los 17 componentes con React (./styleguideHtml.ts), que es lo que le faltaba
   desde el bloque 4. Aquí no hay editor, así que se pinta en el modo del sistema, y en claro cuando
   admite los dos.

   Ese módulo se carga al pulsar, no al abrir la galería: se trae `react-dom/server` y los 17 renders,
   y son 67 kB que no tiene por qué pagar quien solo viene a ver sus sistemas. */
export function DsExportModal({ item, onClose }: { item: DesignSystemListItem; onClose: () => void }) {
  const [row, setRow] = useState<DesignSystemRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  useEffect(() => {
    let alive = true;
    getDesignSystem(item.id)
      .then((r) => alive && setRow(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'No se pudo leer el sistema.'));
    return () => {
      alive = false;
    };
  }, [item.id]);

  const compiled = useMemo(() => (row ? compileSystem(row) : null), [row]);

  const onDownload = async (format: ExportFormat) => {
    if (!row) return;
    setError(null);

    let styleguideHtml: string | undefined;
    if (format === 'styleguide') {
      const system = compiled?.system;
      if (!system?.tokens) {
        setError('Los tokens guardados están dañados y no se puede pintar el styleguide. Ábrelo en el editor para regenerarlos.');
        return;
      }
      setBusy(format);
      try {
        const { buildStyleguideHtml } = await import('./styleguideHtml');
        styleguideHtml = buildStyleguideHtml({
          name: row.name,
          tokens: system.tokens,
          configs: system.configs,
          brand: system.brand,
          mode: system.tokens.modes === 'dark' ? 'dark' : 'light',
          generatedAt: new Date().toISOString(),
        });
      } catch (e) {
        setError(e instanceof Error ? `No se ha podido generar el styleguide: ${e.message}` : 'No se ha podido generar el styleguide.');
        return;
      } finally {
        setBusy(null);
      }
    }

    const res = exportFile(row, format, new Date().toISOString(), styleguideHtml);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    downloadFile(res.file);
  };

  return (
    <Modal title={`Exportar «${item.name}»`} onClose={onClose}>
      <div style={{ font: `400 11px/1.5 ${MONO}`, color: colors.ash, marginBottom: 20 }}>
        Los ficheros salen de los tokens guardados, tal como están, sin recalcular.
      </div>

      {error && (
        <div style={{ font: `400 11px/1.4 ${MONO}`, color: '#99335F', marginBottom: 16 }} role="alert">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button type="button" style={btnGhost} onClick={onClose}>Cerrar</button>
        {FORMATS.map((f) => (
          <button key={f.format} type="button" style={btn} disabled={!row || busy !== null} onClick={() => void onDownload(f.format)}>
            {!row ? 'Preparando' : busy === f.format ? 'Generando' : f.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
