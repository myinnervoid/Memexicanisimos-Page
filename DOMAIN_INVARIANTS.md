# DOMAIN INVARIANTS — Memexicanisimos
**Proyecto:** Memexicanisimos Web Platform
**Fecha:** Marzo 2026

Este documento define los tres pilares fundamentales y las invariantes de negocio de Memexicanisimos, los cuales rigen todas las decisiones de diseño, contenido y desarrollo tecnológico.

---

## 1. Los Tres Pilares Fundamentales

### Pilar 1: Humor e Identidad Nacional
* Memexicanisimos preserva, celebra y difunde la cultura popular, la idiosincrasia y el humor de México (nacido en las redes en 2009-2012).
* Toda comunicación, estilo visual (colores patrios, tipografía, iconografía) y narrativa debe respetar y ensalzar la identidad mexicana, evitando regionalismos excluyentes y apostando por la unidad nacional a través del humor y la sátira cotidiana.

### Pilar 2: Software Libre y Soberano (Apps Libres)
* Desarrollamos y distribuimos herramientas tecnológicas (Rótulos Web, Aetheria, MASV, Files) de código abierto.
* **Invariante:** Las aplicaciones son soberanas. No incluyen rastreadores ocultos, no exigen suscripciones forzosas y pueden ser ejecutadas, inspeccionadas y modificadas localmente por el usuario. El código siempre estará disponible públicamente.

### Pilar 3: Comunidad y Apoyo Directo
* El sustento del proyecto se basa en la utilidad, el mérito y la generosidad de la comunidad ("¡Invítame un Taco!").
* Mantenemos una relación directa y honesta con los seguidores (más de 28k), escuchando sus necesidades tecnológicas y de entretenimiento.

---

## 2. Invariantes Técnicas y de Plataforma

* **Accesibilidad e Inclusión (WCAG 2.2 AA):** El diseño debe mantener un contraste adecuado en los colores patrios y ser navegable mediante teclado y tecnologías de asistencia.
* **Consentimiento Explícito (LFPDPPP):** No se cargarán recursos de terceros (como widgets de Facebook) que utilicen cookies de rastreo sin el consentimiento previo y explícito del usuario.
* **Resiliencia de UI (FSM):** Toda interacción asíncrona o de búsqueda debe modelar explícitamente los estados `[IDLE]`, `[PENDING]`, `[SUCCESS]`, `[EMPTY]` y `[FAULT]` para nunca dejar al usuario en un estado visual indefinido.
* **Contrato de Transporte de Datos (Ley Global 5):** Toda comunicación formal entre componentes o hacia un backend (si existiese) debe cumplir la firma `ApiResponse<T> = { success: boolean, data: T | null, error_code: string | null, message: string }`.