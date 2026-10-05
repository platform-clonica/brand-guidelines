'use client';
import { useState, type CSSProperties } from 'react';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, btnDanger, btnGhost, colors } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { bulkDelete, type BulkDeleteResult } from '@/lib/decks/api';
import type { ImageListItem } from '@/lib/decks/types';
import { blockedMessage, deleteDone, deleteMessage } from '@/lib/images/bulk';
import { errorText, isLegacy } from '@/lib/images/view';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

/* «Eliminar» la selección (entrega 3, G12). Solo se borran las que no se usan; las que sí, se listan con su
   número de documentos y no se tocan.

   - Si todas están en uso: «No se puede eliminar», la lista y «Entendido».
   - Si no: la confirmación, con la lista de las que se quedan, y «Eliminar N» en Burdeos, que pasa a
     «Eliminando». Mientras borra, el modal no se cierra.

   Los usos que se enseñan son los del listado; manda el servidor, que vuelve a comprobarlos al borrar. El aviso
   final cuenta lo que pasó de verdad. */
export function BulkDeleteModal({
  items,
  onClose,
  onDone,
}: {
  items: ImageListItem[];
  onClose: () => void;
  onDone: (result: BulkDeleteResult) => void;
}) {
  const toast = useToast();
  const [deleting, setDeleting] = useState(false);
  const blocked = items.filter((i) => i.use_count > 0);
  const free = items.filter((i) => i.use_count === 0);

  if (!free.length) {
    return (
      <Modal title="No se puede eliminar" onClose={onClose}>
        <p style={msg}>{blockedMessage(blocked.length, items.length)}</p>
        <BlockedList items={blocked} />
        <div style={foot}>
          <button type="button" style={btn} onClick={onClose}>
            Entendido
          </button>
        </div>
      </Modal>
    );
  }

  const confirm = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await bulkDelete(free.map((i) => i.id));
      toast.show(deleteDone({ deleted: res.deleted.length, blocked: blocked.length + res.blocked.length, failed: res.failed.length }));
      onDone(res);
    } catch (e) {
      toast.show(errorText(e, 'No se han podido eliminar las imágenes. Revisa la conexión y vuelve a intentarlo.'));
      setDeleting(false);
    }
  };

  return (
    <Modal title="Eliminar imágenes" onClose={() => !deleting && onClose()}>
      <p style={msg}>{deleteMessage(free.length, free.every((i) => isLegacy(i)))}</p>
      {blocked.length > 0 && (
        <>
          <p style={{ ...msg, marginTop: 6 }}>{blockedMessage(blocked.length, items.length)}</p>
          <BlockedList items={blocked} />
        </>
      )}
      <div style={foot}>
        <button type="button" style={{ ...btnGhost, ...(deleting ? off : null) }} onClick={onClose} disabled={deleting}>
          Cancelar
        </button>
        <button type="button" style={{ ...btnDanger, ...(deleting ? off : null) }} onClick={confirm} disabled={deleting}>
          {deleting ? 'Eliminando' : `Eliminar ${free.length}`}
        </button>
      </div>
    </Modal>
  );
}

/* Las que no se pueden borrar: cuántos documentos las usan y su nombre, como en el prototipo. */
function BlockedList({ items }: { items: ImageListItem[] }) {
  return (
    <ul style={{ margin: '0 0 4px', padding: 0, listStyle: 'none', display: 'grid', gap: 4, font: `400 12px/1.4 ${MONO}`, color: colors.dark }}>
      {items.map((i) => (
        <li key={i.id} style={{ display: 'flex', gap: 8 }}>
          <span style={{ font: `500 10px/1.6 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.ash, minWidth: 56 }}>
            {i.use_count} doc.
          </span>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{i.name}</span>
        </li>
      ))}
    </ul>
  );
}

const msg: CSSProperties = { font: `400 13px/1.55 ${MONO}`, color: colors.dark, margin: '0 0 12px' };
const foot: CSSProperties = { display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 24 };
const off: CSSProperties = { opacity: 0.45, cursor: 'not-allowed' };
