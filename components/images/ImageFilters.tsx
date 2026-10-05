'use client';
import { FilterBar } from '@/components/studio/GalleryFilters';
import { linkBtn } from '@/components/deck/studio/ui';
import { clearFilter, isFiltered, toggleStyle, toggleTag, toggleUntagged, type ImageFilter, type TagFacets } from '@/lib/images/filter';

/* La fila de filtros del banco, sobre el `FilterBar` de las otras galerías (detalles 3 a 5): una píldora
   por etiqueta, que se combinan en Y; «Sin etiquetas», discontinua, que excluye a las demás; «Estilo
   Interactius» (fase 2, F30), que deja solo las que encajan; y «Quitar filtros» como enlace al final cuando
   hay búsqueda o filtro. Sin desplegable de cliente ni estado.

   Las etiquetas salen del banco entero, no de la página cargada. El buscador no va aquí: cada contenedor
   lo pone donde le toca (en la cabecera de IMG_r, arriba del popup). */
export function ImageFilters({
  filter,
  facets,
  onChange,
  marginBottom,
}: {
  filter: ImageFilter;
  facets: TagFacets;
  onChange: (next: ImageFilter) => void;
  marginBottom?: number;
}) {
  const showUntagged = facets.untagged > 0 || filter.untagged;
  return (
    <FilterBar
      clients={[]}
      client={null}
      onClient={() => {}}
      allTags={facets.tags.map((t) => t.tag)}
      selectedTags={filter.tags}
      onToggleTag={(t) => onChange(toggleTag(filter, t))}
      specials={[
        ...(showUntagged ? [{ label: 'Sin etiquetas', active: filter.untagged, onToggle: () => onChange(toggleUntagged(filter)), dashed: true }] : []),
        { label: 'Estilo Interactius', active: filter.style, onToggle: () => onChange(toggleStyle(filter)) },
      ]}
      trailing={
        isFiltered(filter) ? (
          <button type="button" className="hover-wipe-underline" style={linkBtn} onClick={() => onChange(clearFilter())}>
            Quitar filtros
          </button>
        ) : undefined
      }
      marginBottom={marginBottom}
    />
  );
}
