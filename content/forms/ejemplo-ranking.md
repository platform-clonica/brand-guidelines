---
id: fk_R8nk2Ex1
slug: ejemplo-ranking
title: Ordena tus prioridades
client: Interactius
status: published
accent: opal
intro_title: Ejemplo · Ranking
submit_label: Guardar orden
success_title: Listo
success_message: |
  Guardado. Gracias por ordenar tus prioridades.
allow_multiple: true
fields:
  - type: content
    body: |
      Este es un ejemplo del campo **ranking**. Arrastra cada elemento o usa las
      flechas para colocarlos de **más** a **menos** importante.
  - type: ranking
    name: prioridades_marca
    label: ¿Qué debería resolver primero un proyecto de marca?
    caption: Arriba = lo primero. Puedes reordenar todos los elementos.
    options:
      - Claridad de posicionamiento
      - Coherencia visual
      - Tono de voz
      - Arquitectura de marca
      - Relación con el cliente
  - type: ranking
    name: canales
    label: Ordena los canales por prioridad para vuestra marca
    options:
      - Web
      - { value: "social", label: "Redes sociales" }
      - Eventos
      - Comunicación interna
  - type: textarea
    name: comentario
    label: ¿Por qué has puesto lo primero en primer lugar?
    rows: 3
---

Un ejemplo mínimo para ver el campo **ranking** en acción. El orden que dejes
es exactamente el que se guarda.
