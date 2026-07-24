---
id: fk_Qp2mZ8vT
slug: calidad-proyecto
title: Cómo ha ido el proyecto
client: Interactius
status: published
accent: emerald
intro_title: Cierre de proyecto
submit_label: Enviar valoración
success_title: Gracias
success_message: |
  Hemos registrado tu valoración. La leeremos con atención: es lo que nos
  dice qué repetir y qué cambiar en el siguiente proyecto.
allow_multiple: true
fields:
  - type: content
    body: |
      Este cuestionario es breve y **anónimo si así lo prefieres**. No hay respuestas
      correctas: nos interesa tu criterio, no que nos des la razón.
  - type: section
    title: Contexto
    description: Para situar tu respuesta dentro del trabajo que hemos hecho juntos.
  - type: text
    name: nombre
    label: Nombre
    caption: Opcional. Déjalo en blanco si prefieres responder de forma anónima.
  - type: select
    name: rol
    label: ¿Desde qué rol has vivido el proyecto?
    required: true
    placeholder: Elige una opción
    options:
      - Dirección
      - Equipo de marca
      - Equipo de producto
      - { value: "externo", label: "Colaborador externo" }
  - type: date
    name: fecha_cierre
    label: ¿En qué fecha diste el proyecto por cerrado?
  - type: section
    title: Valoración
  - type: scale
    name: recomendacion
    label: ¿Qué probabilidad hay de que nos recomiendes a otro equipo?
    caption: 0 = nada probable · 10 = totalmente probable.
    required: true
    min: 0
    max: 10
    min_label: Nada probable
    max_label: Totalmente probable
  - type: radio
    name: expectativas
    label: Frente a lo que esperabas al empezar, el resultado ha quedado…
    required: true
    options:
      - Por debajo
      - A la altura
      - Por encima
  - type: checkbox
    name: destacar
    label: ¿Qué destacarías del trabajo?
    caption: Marca lo que aplique.
    options:
      - Claridad de criterio
      - Ritmo y cumplimiento de plazos
      - Comunicación durante el proceso
      - Calidad de las piezas finales
  - type: ranking
    name: prioridades
    label: Ordena estos aspectos según lo que más valoras (arriba = más importante)
    caption: Arrastra o usa las flechas para reordenar.
    options:
      - Criterio y dirección
      - Plazos
      - Comunicación
      - Precio
      - Calidad del resultado
  - type: number
    name: personas_impacto
    label: ¿A cuántas personas de tu organización afecta directamente este trabajo?
    caption: Un número aproximado basta.
    min: 0
    max: 100000
  - type: textarea
    name: cambiarias
    label: Si pudieras cambiar una sola cosa de cómo trabajamos, ¿cuál sería?
    rows: 4
    required: true
  - type: url
    name: referencia
    label: ¿Algún trabajo o referencia que resuma bien lo que buscáis ahora?
    placeholder: https://
  - type: section
    title: Seguimiento
  - type: boolean
    name: contactar
    label: Me interesa que Interactius me cuente cómo evoluciona este trabajo más adelante.
---

Cerramos cada proyecto preguntando lo mismo: qué hemos hecho bien y qué nos
habríamos ahorrado. Tu respuesta no va a un cajón; **cambia cómo trabajamos el
siguiente**.
