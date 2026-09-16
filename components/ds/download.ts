import type { ExportedFile } from '@/lib/ds/delivery';

/* Descarga de un fichero generado en el navegador. Lo usan el paso 4 del editor y el modal de la
   galería. El `blob:` se revoca en cuanto el navegador ha empezado la descarga: aquí no vive ningún
   enlace, la entrega es el archivo (definición, Alcance). */
export function downloadFile(file: ExportedFile) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
