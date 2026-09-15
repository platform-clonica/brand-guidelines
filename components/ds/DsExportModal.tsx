'use client';
import { useEffect, useState } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnGhost, colors } from '@/components/deck/studio/ui';
import { getDesignSystem } from '@/lib/ds/api';
import { exportFile, type ExportFormat } from '@/lib/ds/gallery';
import type { DesignSystemListItem, DesignSystemRecord } from '@/lib/ds/types';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const FORMATS: { format: ExportFormat; label: string }[] = [
  { format: 'json', label: 'tokens.json' },
  { format: 'css', label: 'tokens.css' },
];

function download(name: string, mime: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* Exportar desde la galería. El listado no trae los tokens (pesan decenas de KB por fila), así que se
   pide la fila al abrir. Lo que se descarga sale de los tokens GUARDADOS: ver lib/ds/gallery.ts. */
export function DsExportModal({ item, onClose }: { item: DesignSystemListItem; onClose: () => void }) {
  const [row, setRow] = useState<DesignSystemRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getDesignSystem(item.id)
      .then((r) => alive && setRow(r))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'No se pudo leer el sistema.'));
    return () => {
      alive = false;
    };
  }, [item.id]);

  const onDownload = (format: ExportFormat) => {
    if (!row) return;
    const res = exportFile(row, format, new Date().toISOString());
    if (!res.ok) {
      setError(res.error);
      return;
    }
    download(res.file.name, res.file.mime, res.file.content);
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

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" style={btnGhost} onClick={onClose}>Cerrar</button>
        {FORMATS.map((f) => (
          <button key={f.format} type="button" style={btn} disabled={!row} onClick={() => onDownload(f.format)}>
            {row ? f.label : 'Preparando'}
          </button>
        ))}
      </div>
    </Modal>
  );
}
