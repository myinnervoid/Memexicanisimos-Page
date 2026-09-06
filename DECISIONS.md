# DECISIONS & TRADEOFFS — Memexicanisimos Hub (v3.1)
**Proyecto:** Memexicanisimos Web Platform & Visual Studio (`memexicanisimos.com`)  
**Fecha:** Septiembre 2026  
**Fase:** Fase 2 — Generación de Faltantes y Evolución de Software

---

## 1. Registro de Decisiones de Arquitectura (ADR)

### ADR-01: Rediseño Visual "Septiembre Patrio & Noticiero Popular"
* **Contexto del Problema:** La interfaz anterior utilizaba una plantilla genérica con estética oscura y bordes neón morados/azules generada por IA. Esto creaba una disonancia cognitiva total: la audiencia no reconocía los orígenes de Memexicanísimos (humor mexicano, memes de la nación desde 2009 en Facebook), ni la nueva faceta de "Memexicanisimos News" y estudio de software independiente.
* **Decisión Adoptada:** Implementar un sistema de diseño patrio editorial (Edición Septiembre) con paleta verde bandera esmeralda (`#0b4728`, `#006847`), blanco apergaminado/cálido (`#FBF8F2`), rojo carmín charro (`#CE1126`) y acentos dorados heráldicos (`#CF9625`). Integrar los 4 avatares fotorrealistas del monito reportero (*Memexicanisimos News*) en el hero y en una galería temática de cápsulas callejeras (Zócalo, Mercado 23, Plaza Las Américas, Taquería).
* **Consecuencias:**
  * *Positivas:* Identidad única, calidez cultural, alineación perfecta con el mes patrio y el tono satírico/noticioso que atrae viralidad en redes.
  * *Negativas:* Requiere mantener contraste estricto (WCAG 2.2 AA) al combinar verde, rojo y dorado sobre fondos claros/oscuros.

---

### ADR-02: Estandarización Canónica de Transporte `ApiResponse<T>` y Catálogo de Errores
* **Contexto del Problema:** El código en `app.js` utilizaba una estructura asíncrona improvisada `{ success, data, error, error_code }` que violaba la Ley Global 5 y carecía de catálogo formal de errores.
* **Decisión Adoptada:** Centralizar la definición del contrato canónico:
  ```typescript
  type ApiResponse<T> = {
    success: boolean;
    data: T | null;
    error_code: string | null;
    message: string;
  };
  ```
  Crear el catálogo `contracts/errors.js` con códigos de error explícitos (`CLIPBOARD_WRITE_FAILED`, `FEED_UNAVAILABLE`, `FILTER_EMPTY_RESULT`, `INVALID_STORAGE_VERSION`, etc.).
* **Consecuencias:**
  * *Positivas:* Previsibilidad total en la UI, manejo robusto de excepciones y desacoplamiento entre lógica de negocio y presentación.
  * *Negativas:* Ligero incremento en la cantidad de código modular.

---

### ADR-03: Implementación de Autómata Finito de Estados (FSM) en la UI
* **Contexto del Problema:** Componentes interactivos como el buscador de atajos, el explorador de archivos y el cargador de redes carecían de estados de borde (`[EMPTY]`, `[FAULT]`, `[PENDING]`), dejando pantallas en blanco o desorientando al usuario en caso de error o búsqueda sin coincidencias.
* **Decisión Adoptada:** Aplicar la máquina formal de 5 estados: `[IDLE]`, `[PENDING]`, `[SUCCESS]`, `[EMPTY]`, `[FAULT]` en:
  1. Copiado de correo de soporte.
  2. Filtrado y búsqueda interactiva del explorador de archivos y atajos de MASV.
  3. Integración y fallback del widget de Facebook y redes sociales.
* **Consecuencias:**
  * *Positivas:* Resiliencia de UI de clase mundial, cumplimiento de Ley Global 6 y experiencia fluida para el usuario final.

---

### ADR-04: Hub de Productos Ecosistema Completo (5 Aplicaciones .io)
* **Contexto del Problema:** Solo 3 de los repositorios estaban enlazados en el menú, omitiendo el estudio visual generativo (*Aetheria Fluid & Sand Studio*) y la interfaz de IA local (*Memexicanisimos OS*), desaprovechando las demos interactivas activas en GitHub Pages.
* **Decisión Adoptada:** Reorganizar la vitrina de ingeniería en 5 productos oficiales, cada uno con:
  1. Enlace directo a la demo web interactiva `.io`.
  2. Enlace al repositorio GitHub (`myinnervoid`).
  3. Enlace a releases/descargas.
  4. Estado visual interactivo y etiquetas descriptivas claras.

---

### ADR-05: Contención de Memoria y Prevención de Cuelgues en GrapesJS
* **Contexto del Problema:** Al cargar un documento de 366 KB de HTML en el editor visual, el motor GrapesJS clonaba en memoria el árbol DOM completo en cada micro-evento a través del `UndoManager` por defecto. Esto provocaba un consumo exponencial de memoria RAM (heap exhaustion) que congelaba la pestaña del navegador y duplicaba el uso de memoria en entornos con sandbox.
* **Decisión Adoptada:** 
  1. Configurar límites estrictos de memoria en GrapesJS: desactivar el rastreo de selección (`trackSelection: false`) y acotar el historial de deshacer a un máximo de 15 pasos (`maxSteps: 15`).
  2. Implementar sanitización de atributos temporales (`data-gjs-*`) antes de escribir en disco.
  3. Añadir rotación FIFO automática en el servidor de backups (máximo 15 respaldos históricos) para no saturar el almacenamiento.
* **Consecuencias:**
  * *Positivas:* Fluidez total, consumo de RAM controlado (<120MB en vez de >1.5GB), eliminación de cuelgues y estabilidad en cualquier equipo local.
  * *Negativas:* El historial de deshacer solo retiene las últimas 15 modificaciones en lugar de un historial ilimitado.

---

### ADR-06: Suite de Herramientas Modulares y Contratos en el Editor Visual
* **Contexto del Problema:** El usuario requería ampliar las herramientas disponibles en el editor (bloques del ecosistema, visor de código limpio, selector de clases) y homogeneizar la API de `server.js` bajo el contrato obligatorio `ApiResponse<T>`.
* **Decisión Adoptada:**
  1. Migrar todos los endpoints de `server.js` (`/api/page`, `/api/save`, `/api/assets`, `/api/shutdown`) a la estructura `ApiResponse<T>`.
  2. Enriquecer el `BlockManager` con bloques del ecosistema: Vitrina de Apps, Donaciones ("¡Invítame un Taco!"), Banner de Alerta y Tarjetas Informativas.
  3. Incorporar modal de inspección y edición de código HTML fuente limpio sin recargar el motor.
* **Consecuencias:**
  * *Positivas:* Cumplimiento total de la Ley Global 5, arquitectura robusta, herramientas potentes listas para usar y separación limpia entre lógica de servidor y lienzo.

---

### ADR-07: Aislamiento de Edición de Texto en Nodos Hoja y Erradicación de Bucles de Vaciado en Cascada
* **Contexto del Problema:** Al seleccionar un elemento y modificar texto, o al hacer clic de un elemento a otro en el lienzo de GrapesJS, los elementos desaparecían progresivamente en pantalla ("efecto desaparición en cascada"). El diagnóstico técnico identificó dos causas raíz:
  1. `textComponentTypes` incluía etiquetas contenedoras estructurales (`div`, `section`, `article`, `header`, `footer`). En GrapesJS, invocar `comp.set('content', text)` sobre un contenedor estructural **elimina todos los modelos Backbone y nodos DOM hijos**, borrando tarjetas, imágenes y layouts anidados.
  2. Un escuchador global `editor.on('component:update')` leía el valor de `textTrait.get('value')` (cuyo valor inicial al montarse era `""` o `undefined`) y lo comparaba con el texto del componente. Al evaluar `"" !== "Texto"` como verdadero, invocaba `setComponentText(comp, "")` en cada cambio de selección, borrando cualquier elemento pulsado.
* **Decisión Adoptada:**
  1. Restringir estrictamente `isTextEditable(component)` a verdaderos nodos hoja de texto (`span`, `p`, `h1`-`h6`, `label`, `button`, `a`, badges) y rechazar cualquier contenedor con múltiples elementos hijos o etiquetas estructurales.
  2. Erradicar por completo el hook desbocado `editor.on('component:update')`.
  3. Vincular la edición de texto exclusivamente a la interacción explícita del usuario mediante `component.on('change:text_content')`, inicializando la propiedad con `{ silent: true }` para evitar disparadores en blanco durante el montaje.
* **Consecuencias:**
  * *Positivas:* Blindaje absoluto del árbol DOM en memoria. Eliminación definitiva de la pérdida accidental de elementos o texto en cascada.
  * *Negativas:* Para editar un texto dentro de un contenedor complejo, el usuario debe seleccionar el elemento de texto específico (usando la barra de migas o el lienzo) y no el `div` envolvente.

---

### ADR-08: Desacoplamiento de Navegación de Enlaces en Lienzo y Renderizado Reactivo Directo de Traits de Texto
* **Contexto del Problema:** Al intentar editar la insignia roja del héroe (`.news-live-tag`) desde el panel de propiedades para cambiarla de "🔴 EN VIVO · ZÓCALO CDMX" a "🔴 EN VIVO · TAQUERIA", el texto no se actualizaba en pantalla o el elemento colapsaba a 0px de altura. El análisis técnico identificó dos causas fundamentales:
  1. En GrapesJS, los componentes de texto tipo hoja que contienen un modelo hijo `textnode` no propagan automáticamente las actualizaciones de contenido a la vista DOM del componente padre (`ComponentView`), pues el `textnode` carece de vista propia y el componente principal retenía `content: ""`.
  2. Los enlaces dentro del lienzo ejecutaban un manejador de eventos en fase de captura sobre `a[href^="#"]` que interceptaba los clics del usuario para conmutar paneles, imposibilitando seleccionar o editar enlaces directamente en el lienzo sin provocar saltos de página o interferencias por superposición.
* **Decisión Adoptada:**
  1. Extirpar el interceptor de navegación en captura para enlaces dentro del lienzo e implementar `preventDefault()` universal en modo edición para que ningún clic en un `<a>` provoque saltos o recargas. La navegación estructural queda delegada al cajón lateral y la barra de migas.
  2. Redefinir `setComponentText()` para que actualice de forma directa y atómica el `textContent` / `nodeValue` en el DOM del iframe (`view.el`), reseteando componentes huérfanos y garantizando que tanto el modelo de exportación (`toHTML()`) como la vista visual coincidan en todo momento.
  3. Vincular sincronización reactiva en tiempo real (`input` event) en los campos de propiedades para que cada pulsación de teclado se refleje inmediatamente en el lienzo sin requerir pérdida de foco ni recargas, y habilitar `editable: true` para admitir edición directa por doble clic.
* **Consecuencias:**
  * *Positivas:* Actualización visual instantánea e impecable de badges, títulos y párrafos sin colapsos de altura. Clics sobre botones y enlaces permiten editarlos limpiamente sin saltos de página.
  * *Negativas:* Para interactuar con enlaces reales (navegar como usuario final), se debe usar el botón "Vista Previa" del editor.

---

### ADR-09: Widget de Color con Paleta Rápida Siempre Visible, Selector Nativo y Diccionario de Español
* **Contexto del Problema:** En el panel de Estilos (`Color Texto` y `Color Fondo`), los campos se renderizaban como entradas de texto plano que únicamente aceptaban nombres en inglés (`red`, `blue`) o códigos hexadecimales (`#006847`). Al escribir términos naturales en español como `azul`, `verde` o `dorado`, el motor CSS los descartaba. No existía muestra visual de color (swatch), selector cromático con cuentagotas ni paleta rápida accesible, obligando al usuario a adivinar códigos o traducir mentalmente al inglés.
* **Decisión Adoptada:**
  1. Diseñar e integrar `talachaColorPlugin` mediante `StyleManager.addType('color', ...)` en GrapesJS.
  2. Implementar un widget híbrido compuesto por:
     * Muestra de color interactiva conectada a un `<input type="color">` nativo (con cuentagotas y rueda de color del sistema).
     * Entrada de texto con sincronización bidireccional reactiva.
     * Diccionario inteligente de auto-traducción en español (`SPANISH_COLOR_MAP`) que mapea términos coloquiales (`azul`, `rojo`, `verde bandera`, `dorado`, `blanco hueso`, `transparente`, etc.) a sus valores CSS válidos.
     * Paleta rápida de 1 clic siempre visible (Patria + Web Esencial) con tooltips en español.
     * Barra de memoria de colores recientes de la sesión (estilo paleta de favoritos de Paint).
* **Consecuencias:**
  * *Positivas:* Eliminación total de la barrera de idioma inglés para la selección de colores. Aplicación inmediata de tonos identitarios de la marca con 1 solo clic.
  * *Negativas:* Ocupa un espacio vertical ligeramente mayor en el panel derecho (compensado con el redimensionador de sidebar).

---

## 2. Matriz de Trade-offs

| Decisión Técnica | Beneficio Directo | Costo / Penalización | Alternativa Descartada | Razón del Rechazo |
| :--- | :--- | :--- | :--- | :--- |
| **Vanilla JS Modular + CSS Puro** | Cero dependencias externas, carga ultrarrápida en GitHub Pages, 100% auditable y compatible. | Mantenimiento manual de componentes sin reactividad automática tipo React/Vue. | Framework pesado (Next.js / Vite SPA). | Complejidad innecesaria para un sitio de aterrizaje y catálogo que corre estáticamente en GitHub Pages. |
| **FSM declarativa en Vanilla JS** | Control granular y determinista de estados `[IDLE, PENDING, SUCCESS, EMPTY, FAULT]`. | Requiere implementar manejadores de renderizado manuales para cada componente. | Dejar estados implícitos con `style.display`. | Provoca pantallas vacías, falta de feedback en errores y transiciones bruscas. |
| **Límite de 15 pasos en UndoManager** | Elimina fugas de memoria y evita que la pestaña se cuelgue al editar un HTML de 366 KB. | No se pueden deshacer más de 15 acciones consecutivas en una misma sesión. | Snapshots infinitos sin límite de memoria. | Causa colapso total de memoria y congelamiento del navegador reportado por el usuario. |
| **Rotación FIFO de 15 Backups** | Protege el espacio en disco y mantiene orden en `herramientas_editor/backups/`. | Los respaldos de más de 15 versiones atrás se van depurando automáticamente. | Acumulación indefinida de archivos `.html`. | Saturación del disco local a razón de ~370 KB por cada guardado. |
| **Estandarización `ApiResponse<T>` en Express** | Consistencia total con la Ley Global 5; tratamiento uniforme de errores y datos. | Requiere encapsular las respuestas de `server.js` en `{ success, data, error_code, message }`. | Devolver JSON plano ad-hoc (`{ success, html, css }`). | Provoca inconsistencia de transporte e imposibilita pruebas automatizadas estandarizadas. |
| **Aislamiento de traits en nodos hoja** | Evita la destrucción de nodos DOM anidados y erradica bucles de vaciado en cascada. | Requiere seleccionar el elemento hijo de texto específico en vez del contenedor padre. | Permitir edición de texto sobre cualquier `div` o `section`. | Destruye irrevocablemente todos los elementos hijos en GrapesJS al sobrescribir `content`. |
| **Desacoplamiento de enlaces y DOM directo** | Permite editar enlaces y badges al vuelo sin saltos de página ni colapsos visuales. | Los enlaces no navegan mientras se está en modo edición; requiere pulsar "Vista Previa". | Mantener navegación activa de enlaces en el lienzo. | Provoca saltos de sección indeseados, impide seleccionar texto de botones y genera superposición. |
| **Widget de Color + Paleta en Español** | Permite seleccionar colores visualmente, usar nombres en español y paleta rápida sin adivinar. | Ocupa más espacio vertical en el panel de Estilos. | Input de texto estándar con nombres en inglés. | Frustración de usuario, errores de CSS al escribir en español e imposibilidad de cuentagotas. |


