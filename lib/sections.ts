export type SectionId =
  | 'intro'
  | 'tono-marca'
  | 'concepto'
  | 'logo'
  | 'area-reserva'
  | 'tamano-minimo'
  | 'usos-incorrectos'
  | 'tipografia'
  | 'color'
  | 'universo-visual';

export type SectionDef = {
  id: SectionId;
  num: string;
  label: { es: string; en: string };
};

export const sections: SectionDef[] = [
  { id: 'intro',             num: '01', label: { es: 'Introducción',     en: 'Introduction' } },
  { id: 'tono-marca',        num: '02', label: { es: 'Tono de marca',    en: 'Brand voice' } },
  { id: 'concepto',          num: '03', label: { es: 'Concepto',         en: 'Concept' } },
  { id: 'logo',              num: '04', label: { es: 'Logo',             en: 'Logo' } },
  { id: 'area-reserva',      num: '05', label: { es: 'Área de reserva',  en: 'Clear space' } },
  { id: 'tamano-minimo',     num: '06', label: { es: 'Tamaño mínimo',    en: 'Minimum size' } },
  { id: 'usos-incorrectos',  num: '07', label: { es: "Do/Dont's", en: "Do/Dont's" } },
  { id: 'tipografia',        num: '08', label: { es: 'Tipografía',       en: 'Typography' } },
  { id: 'color',             num: '09', label: { es: 'Color',            en: 'Colour' } },
  { id: 'universo-visual',   num: '10', label: { es: 'Imágenes',         en: 'Images' } },
];
