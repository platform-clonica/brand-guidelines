export type SectionId =
  | 'intro'
  | 'tono-marca'
  | 'concepto'
  | 'logo'
  | 'area-reserva'
  | 'tamano-minimo'
  | 'usos-incorrectos'
  | 'tipografia'
  | 'sistema-texto'
  | 'color'
  | 'universo-visual'
  | 'sistema-grafico'
  | 'aplicaciones'
  | 'movimiento'
  | 'ia-ready';

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
  { id: 'sistema-texto',     num: '09', label: { es: 'Sistema de texto', en: 'Type system' } },
  { id: 'color',             num: '10', label: { es: 'Color',            en: 'Colour' } },
  { id: 'universo-visual',   num: '11', label: { es: 'Imágenes',         en: 'Images' } },
  { id: 'sistema-grafico',   num: '12', label: { es: 'Sistema gráfico',  en: 'Graphic system' } },
  { id: 'aplicaciones',      num: '13', label: { es: 'Aplicaciones',     en: 'Applications' } },
  { id: 'movimiento',        num: '14', label: { es: 'Movimiento',       en: 'Motion' } },
  { id: 'ia-ready',          num: '15', label: { es: 'Manual para IA',   en: 'Manual for AI' } },
];
