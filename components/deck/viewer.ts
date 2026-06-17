import { createContext } from 'react';

/* True when the deck is rendered as a shared, client-facing presentation
   (no editor, no image editing, no site chrome). */
export const ViewerContext = createContext(false);

/* Editor-only callback to open the image gallery for a given slide. Null in viewer mode
   and anywhere images aren't editable (thumbnails, shared view), which makes ImageSlot
   render as a plain, non-clickable image. */
export const ImageEditContext = createContext<((slideIndex: number) => void) | null>(null);
