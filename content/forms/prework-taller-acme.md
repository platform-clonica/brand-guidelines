---
id: fk_7Gq3xR9a
slug: prework-taller-acme
title: Taller de Estrategia Ecommerce
client: Massimo Dutti
status: published
logo: https://static.massimodutti.net/3/cms//assets/uploads/md-logo-white.svg
background: https://static.massimodutti.net/assets/public/51c2/dbae/9d3a463cac4e/1ec443b9e8d6/04722555800-o11-3-2760692-digital_v2/04722555800-o11-3-2760692-digital_v2.jpg?ts=1776346751705&w=1920&f=auto
accent: bordeaux
intro_title: Antes de empezar
submit_label: Enviar respuestas
success_title: ¡Gracias!
success_message: |
  Hemos recibido correctamente tus respuestas. Las revisaremos antes de la sesión.
allow_multiple: true
fields:
  - type: section
    title: Sobre ti
    description: Cuéntanos quién eres para preparar mejor la sesión.
  - type: text
    name: nombre
    label: Nombre y apellidos
    required: true
  - type: email
    name: email
    label: Email de contacto
    caption: Lo usaremos **solo** para el seguimiento del taller.
    required: true
  - type: radio
    name: rol
    label: ¿Cuál es tu rol en el proyecto?
    required: true
    options:
      - Dirección
      - Marketing
      - Producto
      - { value: "otro", label: "Otro" }
  - type: section
    title: Expectativas
  - type: textarea
    name: objetivos
    label: ¿Qué esperas conseguir con el taller?
    caption: No hace falta que sea exhaustivo; unas líneas bastan.
    rows: 5
    required: true
  - type: checkbox
    name: temas
    label: ¿Qué temas te interesan más?
    caption: Puedes elegir varios.
    max_select: 3
    options:
      - Posicionamiento
      - Tono de voz
      - Identidad visual
      - Arquitectura de marca
  - type: scale
    name: madurez
    label: ¿Cómo valoras la madurez actual de vuestra marca?
    min: 0
    max: 10
    min_label: Incipiente
    max_label: Muy consolidada
  - type: boolean
    name: consentimiento
    label: Acepto que Interactius trate estas respuestas para preparar el taller.
    required: true
---

Este breve cuestionario nos ayuda a **personalizar el taller** a vuestra
realidad. Te llevará unos 5 minutos. Tus respuestas son confidenciales.
