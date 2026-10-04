/* Ancho y alto de un JPEG o un PNG leídos de su cabecera, sin decodificar la imagen: para «Versión N ·
   <ancho> × <alto> px» (F8) y para guardar las medidas del original de una edición. */

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length >= 24 && v.getUint32(0) === 0x89504e47 && v.getUint32(12) === 0x49484452) {
    return { width: v.getUint32(16), height: v.getUint32(20) };
  }
  if (bytes.length < 4 || v.getUint16(0) !== 0xffd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (SOF.has(marker)) return { width: v.getUint16(i + 7), height: v.getUint16(i + 5) };
    i += 2 + v.getUint16(i + 2);
  }
  return null;
}
