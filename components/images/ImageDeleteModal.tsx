'use client';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/deck/studio/ConfirmModal';
import { Modal } from '@/components/deck/studio/Modal';
import { btn, colors } from '@/components/deck/studio/ui';
import { useToast } from '@/components/ui/Toast';
import { deleteImage, imageUsage } from '@/lib/decks/api';
import type { ImageUse } from '@/lib/decks/types';
import { isLegacy } from '@/lib/images/view';

const MONO = 'var(--font-ibm-plex-mono, monospace)';

const KIND: Record<ImageUse['kind'], string> = { deck: 'Deck', form: 'Formulario' };

/* Borrar una imagen del banco (detalles 36 y 37). La regla vive en la API: si algún deck o formulario la
   usa, DELETE responde 409 y no toca nada. Esto la cuenta:

   - En uso: «No se puede eliminar», con la lista de documentos y «Entendido».
   - Sin uso: la confirmación de siempre, que avisa de que se van también el original y la ligera.

   `uses` llega ya calculado desde el detalle; el popup no lo tiene y se pide aquí. Si al confirmar resulta
   que alguien la colocó entretanto, el 409 trae la lista y se pasa a «No se puede eliminar». */
export function ImageDeleteModal({
  image,
  uses: known,
  onClose,
  onDeleted,
}: {
  image: { id: string; name: string; original_path: string | null };
  uses?: ImageUse[];
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const toast = useToast();
  const [uses, setUses] = useState<ImageUse[] | null>(known ?? null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (known) return;
    let live = true;
    imageUsage(image.id)
      .then((u) => live && setUses(u.uses))
      // Sin saberlo se ofrece confirmar: el DELETE vuelve a comprobarlo y responde 409 si está en uso.
      .catch(() => live && setUses([]));
    return () => {
      live = false;
    };
  }, [image.id, known]);

  if (!uses) return null;

  if (uses.length) {
    const one = uses.length === 1;
    return (
      <Modal title="No se puede eliminar" onClose={onClose}>
        <p style={{ font: `400 13px/1.55 ${MONO}`, color: colors.dark, margin: '0 0 12px' }}>
          «{image.name}» se usa en {one ? 'un documento' : `${uses.length} documentos`}. Cambia la imagen en {one ? 'él' : 'ellos'} y
          vuelve a intentarlo.
        </p>
        <UsesList uses={uses} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
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
      const res = await deleteImage(image.id);
      if (!res.ok) {
        setUses(res.uses);
        return;
      }
      toast.show('Imagen eliminada');
      onDeleted(image.id);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : 'No se pudo eliminar la imagen.');
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmModal
      title="Eliminar imagen"
      message={`Se borrará «${image.name}»${isLegacy(image) ? '' : ', con su original y su versión ligera'}. Ningún deck ni formulario la usa. Esta acción no se puede deshacer.`}
      confirmLabel={deleting ? 'Eliminando' : 'Eliminar'}
      danger
      onConfirm={confirm}
      onClose={() => !deleting && onClose()}
    />
  );
}

/* La lista «Se usa en»: tipo y nombre del documento. La comparten el detalle y el borrado bloqueado. */
export function UsesList({ uses }: { uses: ImageUse[] }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, font: `400 12px/1.4 ${MONO}`, color: colors.dark }}>
      {uses.map((u) => (
        <li key={`${u.kind}:${u.id}`} style={{ display: 'flex', gap: 8 }}>
          <span style={{ font: `500 10px/1.6 ${MONO}`, letterSpacing: '.06em', textTransform: 'uppercase', color: colors.ash, minWidth: 72 }}>
            {KIND[u.kind]}
          </span>
          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{u.name}</span>
        </li>
      ))}
    </ul>
  );
}
