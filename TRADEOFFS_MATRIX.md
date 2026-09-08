# MATRIZ DE TRADE-OFFS — Memexicanisimos Hub (v3.2)
**Proyecto:** Memexicanisimos Web Platform & Visual Studio (`memexicanisimos.com`)
**Fecha:** Marzo 2026

| Decisión Técnica | Beneficio Directo | Costo / Penalización | Alternativa Descartada | Razón del Rechazo |
| :--- | :--- | :--- | :--- | :--- |
| **Vanilla JS Modular + CSS Puro** | Cero dependencias externas, carga ultrarrápida en GitHub Pages, 100% auditable y compatible. | Mantenimiento manual de componentes sin reactividad automática tipo React/Vue. | Framework pesado (Next.js / Vite SPA). | Complejidad innecesaria para un sitio de aterrizaje y catálogo que corre estáticamente en GitHub Pages. |
| **FSM declarativa en Vanilla JS** | Control granular y determinista de estados `[IDLE, PENDING, SUCCESS, EMPTY, FAULT]`. | Requiere implementar manejadores de renderizado manuales para cada componente. | Dejar estados implícitos con `style.display`. | Provoca pantallas vacías, falta de feedback en errores y transiciones bruscas. |
| **Estandarización `ApiResponse<T>` en frontend** | Consistencia total con la Ley Global 5; tratamiento uniforme de errores y datos. | Requiere encapsular las respuestas simuladas/locales en la estructura de transporte. | Usar JSON ad-hoc (`{ success, error_message }`). | Provoca inconsistencia de transporte y dificultad para mapear errores en la interfaz de usuario. |
| **Desacoplamiento del repositorio web** | El proyecto web funciona de manera independiente, alojado estáticamente, sin requerir el backend de Rótulos Web para existir. | Las herramientas (Rótulos Web) se deben gestionar en su propio repositorio o como submódulos independientes. | Monorepo rígido. | Complejidad de despliegue; el sitio web estático debe ser independiente de las herramientas de edición locales. |