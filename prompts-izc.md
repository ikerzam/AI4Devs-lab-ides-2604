# Prompts — Historia "Añadir Candidato al Sistema"

## Paso 1 — Refinar la historia de usuario

**Agente:** `story-refiner`

**Prompt:**

> Refina la siguiente historia de usuario para el proyecto LTI (Talent Tracking System). Devuelve el documento completo siguiendo tu formato estándar (CA testables, escenarios Gherkin, especificación funcional y técnica, DoD, dependencias, decisiones pendientes y estimación). Antes, explora `backend/prisma/schema.prisma` y `backend/src/` para ver qué existe ya y qué hay que añadir.
>
> Historia original:
>
> ### Añadir Candidato al Sistema
> Como reclutador, quiero tener la capacidad de añadir candidatos al sistema ATS, para que pueda gestionar sus datos y procesos de selección de manera eficiente.
>
> **Criterios de Aceptación:**
> 1. Accesibilidad de la función: botón/enlace visible para añadir candidato desde el dashboard.
> 2. Formulario de ingreso de datos: nombre, apellido, correo, teléfono, dirección, educación, experiencia laboral.
> 3. Validación de datos: campos obligatorios y formatos correctos (email, etc.).
> 4. Carga de documentos: CV en PDF o DOCX.
> 5. Confirmación de añadido: mensaje de éxito.
> 6. Errores y manejo de excepciones: feedback claro ante fallos.
> 7. Accesibilidad y compatibilidad: multidispositivo y multinavegador.
>
> **Notas:** UI intuitiva, considerar autocompletado en educación y experiencia.
>
> **Tareas técnicas:** UI del formulario, backend de procesamiento, seguridad/privacidad de datos.

**Resultado:** historia refinada guardada en [`docs/historias/01-anadir-candidato.md`](docs/historias/01-anadir-candidato.md). Estimación **L**. Incluye 14 CA, 9 escenarios Gherkin, modelos Prisma `Candidate`/`Education`/`WorkExperience`, endpoint `POST /api/candidates` con `multipart/form-data`, validación con zod + multer, propuesta de split en 4 historias M.

**Decisiones cerradas con el usuario:**
- DEC1: único reclutador implícito (sin modelo Recruiter ni FK).
- Alcance: todo en una pasada (L), no troceamos.
- DEC4: tras crear, toast + redirigir a `/candidates/:id` (implica GET endpoint + pantalla mínima de detalle).
- DoD: tests automáticos sí (integración + unitarios + componente).
- DEC2, DEC3, DEC5, DEC6, DEC7, DEC8: se aceptan las recomendaciones del agente.

Las decisiones cerradas quedan registradas al final de la historia refinada.

---

## Paso 2 — Implementar la historia

**Agente:** `implementer`

**Prompt:**

> Implementa la historia refinada `docs/historias/01-anadir-candidato.md` siguiendo TODAS las decisiones cerradas que hay al final del documento. Antes de tocar código, devuélveme tu plan corto (3-8 bullets) de archivos a crear/modificar. Luego procede.
>
> Resumen ejecutivo del alcance:
> - Backend: modelos Prisma `Candidate`, `Education`, `WorkExperience` con relación 1:N y `onDelete: Cascade`; migración `add_candidate_education_experience`; endpoints `POST /api/candidates` (multipart/form-data con `data` JSON + `cv` fichero, max 5 MB, PDF/DOCX) y `GET /api/candidates/:id`; validación zod; multer con diskStorage en `backend/uploads/cvs/<uuid>.<ext>` + `fileFilter` MIME + `limits`; transacción Prisma con rollback de fichero si falla; manejo de errores con códigos `VALIDATION_ERROR`, `INVALID_FILE`, `EMAIL_ALREADY_EXISTS`; Swagger en `/api-docs`; CORS y `express.json` configurados; `uploads/` al `.gitignore`.
> - Frontend: router con `/`, `/candidates/new`, `/candidates/:id`; `DashboardPage` con botón "Añadir candidato"; `CandidateFormPage` con `react-hook-form` + `zod`; secciones repetibles educación/experiencia; campo CV con validación cliente; estados loading/error/éxito; accesibilidad (labels, aria-describedby, aria-invalid, foco al primer error, toast con role="status"); axios para llamada `multipart/form-data`; pantalla detalle mínima de solo lectura.
> - DEC1: NO añadir `recruiterId` ni `Recruiter`. Único reclutador implícito.
>
> Reglas: no commitees, no instales librerías sin avisar (instala las necesarias: multer, @types/multer, cors, @types/cors, zod, uuid, @types/uuid en backend; react-router-dom, react-hook-form, zod, @hookform/resolvers, axios en frontend). Deja indicado el comando de migración para que yo lo lance. Al final dame: resumen de cambios, pasos manuales pendientes (instalación, migración, .env), cómo probarlo a mano y mensaje de commit propuesto.

> Aviso de entorno: el usuario tiene **fnm** instalado, no volta. No añadir configuración de volta.

**Resultado:** implementación completa.

Backend creado/modificado:
- `prisma/schema.prisma`: nuevos modelos `Candidate`, `Education`, `WorkExperience` con `onDelete: Cascade`.
- `src/app.ts` (nuevo) + `src/index.ts` (solo `listen`).
- `src/routes/candidate.routes.ts`, `src/controllers/candidate.controller.ts`, `src/services/candidate.service.ts`, `src/services/file-storage.service.ts`.
- `src/middlewares/upload.middleware.ts` (multer diskStorage + UUID + filtro MIME PDF/DOCX + límite 5 MB), `src/middlewares/error.middleware.ts` (mapeo a `VALIDATION_ERROR`, `INVALID_FILE`, `EMAIL_ALREADY_EXISTS`, `INTERNAL_ERROR`).
- `src/schemas/candidate.schema.ts` (zod), `src/prisma/client.ts` (singleton), `src/types/swagger.d.ts`.
- Endpoints: `POST /api/candidates` (multipart), `GET /api/candidates/:id`, `GET /api/candidates/:id/cv` (descarga).
- Swagger en `/api-docs`, CORS, `express.json({ limit: '1mb' })`.
- Deps añadidas: `multer`, `cors`, `zod@3.22.4` (fijada por compat con TS 4.9), `uuid`, `@types/multer`, `@types/cors`, `@types/uuid`.

Frontend creado/modificado:
- `src/App.tsx` con `BrowserRouter` y rutas `/`, `/candidates/new`, `/candidates/:id`.
- `src/pages/DashboardPage.tsx`, `src/pages/CandidateFormPage.tsx` (RHF + zod + `useFieldArray` + a11y), `src/pages/CandidateDetailPage.tsx`.
- `src/components/FormFieldError.tsx`, `src/components/Toast.tsx`.
- `src/schemas/candidate.schema.ts`, `src/services/api.ts`, `src/services/candidate.api.ts`, `src/types/candidate.ts`.
- `frontend/.env` con `REACT_APP_API_URL=http://localhost:3010`.
- Deps añadidas: `react-router-dom`, `react-hook-form`, `zod@3.22.4`, `@hookform/resolvers`, `axios`.

Raíz:
- `.gitignore` actualizado (ignora `backend/uploads/*` excepto `.gitkeep` y `**/.env`).

Pasos manuales pendientes para el usuario:
1. `docker compose up -d` (Postgres).
2. `cd backend && npx prisma migrate dev --name add_candidate_education_experience && npx prisma generate`.
3. `cd backend && npm run dev`.
4. `cd frontend && npm start` (en otra terminal).

Decisión técnica del implementer: fijar `zod@3.22.4` (no 3.23+) por incompatibilidad de los `.d.cts` de zod con TypeScript 4.9 del proyecto. Para subir zod habría que bumpar TS, fuera de alcance.

Mensaje de commit propuesto (no commitear aún):
```
feat(candidates): añadir alta de candidatos con CV, educación y experiencia

- Backend: modelos Prisma Candidate/Education/WorkExperience, endpoint
  POST /api/candidates (multipart) con validación zod y transacción
  atómica + rollback de fichero, GET /:id y GET /:id/cv, multer con
  diskStorage y UUID, CORS, error handler tipado y Swagger en /api-docs.
- Frontend: rutas /, /candidates/new y /candidates/:id, formulario
  accesible con react-hook-form + zod, secciones repetibles de
  educación/experiencia, upload de CV con validación cliente, toast de
  éxito y redirección al detalle.
- Estructura modular en backend (routes/controllers/services/schemas/
  middlewares) y separación app.ts / index.ts para facilitar tests.
- .gitignore: ignora backend/uploads salvo .gitkeep; frontend/.env con
  REACT_APP_API_URL.
```

---

## Paso 3 — Review y Tests (en paralelo)

### 3a) Reviewer

**Agente:** `reviewer`

**Prompt resumido:** auditar los cambios pendientes contra la historia y las decisiones cerradas; especial foco en seguridad del upload, transaccionalidad, códigos de error, cobertura CA, accesibilidad, mapeo P2002→409, CORS, PII y posibles atajos en los tests adaptados.

**Resultado:** Veredicto **"Aprobado con cambios menores"**.

🔴 **Bloqueantes (2):**
1. DoD de tests incumplida — los tests "adaptados" eran atajos triviales, no había tests reales (se cubre con el agente `tester` en 3b).
2. Fichero parcial huérfano cuando multer aborta por `LIMIT_FILE_SIZE` (multer.diskStorage ya escribió bytes en disco y `req.file` queda `undefined` así que el cleanup no encuentra el path).

🟡 **Recomendaciones (11):** falta `.env.example`, falta `backend/uploads/.gitkeep` (sí está `backend/uploads/cvs/.gitkeep`), `cvFilePath` guarda ruta absoluta (rompe portabilidad y no valida estar dentro de `CV_UPLOADS_DIR`), MIME falseable (sin magic-number check), PII en logs del error handler, foco al primer error puede fallar en campos anidados, tipado laxo del cast a `keyof CandidateFormValues`, `role="alert"` ruidoso en cada `FormFieldError`, `Content-Disposition` no usa `filename*=UTF-8''`, `prompts-izc.md` untracked, otros menores.

🟢 **Sugerencias (~10).**

### 3b) Tester

**Agente:** `tester`

**Prompt resumido:** diseñar pirámide de tests (integración supertest + unitarios zod + componente RTL) cubriendo los 14 CA y 9 escenarios Gherkin. Mockear axios en frontend. DB real con cleanup en `beforeEach`.

**Resultado:** **59 tests añadidos**:
- Backend: 18 unitarios schema + 3 file-storage + 21 integración rutas.
- Frontend: 17 componente (Dashboard, CandidateFormPage, CandidateDetailPage).
- Frontend: 17/17 OK.
- Backend: **32 OK / 10 fallan** todos por el mismo bug raíz (ver abajo).

**🔴 Bug crítico de producción descubierto por el tester (independiente del bloqueante 2 del reviewer):**

`backend/tsconfig.json` tiene `"target": "es5"`. Al compilar `class CustomError extends Error` a ES5 con TypeScript, `instanceof` falla en runtime porque no se restablece el prototype chain (https://github.com/microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work).

Consecuencia: en el error middleware, NADA de `err instanceof ValidationError`, `err instanceof EmailAlreadyExistsError`, `err instanceof InvalidFileError` ni `err instanceof FileWriteError` evalúa a true. Todos los errores caen al `else` final y devuelven **500 INTERNAL_ERROR** en lugar de 400/409/etc.

**Verificado en runtime con curl:**
- `POST /api/candidates` con `data={}` → 500 (debería ser 400 VALIDATION_ERROR).
- `POST /api/candidates` con email duplicado → 500 (debería ser 409 EMAIL_ALREADY_EXISTS).

CA5, CA6, CA7, CA9 incumplidos en runtime.

**Soluciones propuestas:**
- (Recomendada) Subir `target` a `es2017+` en `backend/tsconfig.json`.
- O añadir `Object.setPrototypeOf(this, new.target.prototype)` en cada constructor de las 4 clases de error.

**Infraestructura de tests añadida:**
- `backend/jest.config.js` actualizado (testRegex, moduleNameMapper para uuid v14 ESM, setupFiles).
- `backend/src/tests/setup-env.ts` (expansión `${VAR}` en DATABASE_URL).
- `backend/src/tests/__mocks__/uuid.ts` (stub CJS).
- `frontend/jest.config.js` reescrito con babel-jest + polyfills + moduleNameMapper para react-router v7 ESM.
- `frontend/src/tests/setup-polyfills.ts` (TextEncoder/TextDecoder).
- `frontend/src/tests/__mocks__/styleMock.js`.

**No tocó código de producción** salvo configuración de jest.

---

## Paso 4 — Arreglar bloqueantes (pendiente)

**Plan a ejecutar con `implementer`:**
1. Subir `target` a `es2017` en `backend/tsconfig.json` (arregla el bug del `instanceof` → los 10 tests rojos pasarán a verde).
2. Arreglar el huérfano en `LIMIT_FILE_SIZE` (registrar la ruta generada por `multer.diskStorage` en `req` desde el `filename` callback, y limpiar en el error handler aunque `req.file` sea undefined).
3. Opcional pero recomendado: aplicar las 2-3 recomendaciones más relevantes (`.env.example`, fallback de foco con `document.getElementById`, no almacenar ruta absoluta del CV en BD).
4. Re-ejecutar tests y volver a verificar smoke tests del curl.

**Resultado:** todos los bloqueantes y recomendaciones aplicados y verificados.

Cambios del implementer:
- **B1** `backend/tsconfig.json`: `target: es5` → `es2017`. `instanceof` ya funciona con clases `extends Error`.
- **B2** `backend/src/types/express.d.ts` (nuevo) + `upload.middleware.ts` + `error.middleware.ts`: el `filename` callback de multer registra `req.cvDiskPath`; el error handler limpia el fichero parcial aunque `req.file` sea `undefined` (LIMIT_FILE_SIZE).
- **R1** `backend/.env.example` (nuevo, con placeholders y patrón `${VAR}`).
- **R2** `backend/uploads/.gitkeep` (nuevo).
- **R3** `candidate.service.ts` guarda solo el basename; `candidate.controller.ts` reconstruye y valida con `path.resolve` que no escape de `CV_UPLOADS_DIR`.
- **R4** `file-storage.service.ts`: `verifyFileMagicNumbers` (PDF `%PDF-`, DOCX `PK\x03\x04`); se invoca en el controller antes de la transacción.
- **R5** `error.middleware.ts`: log redactado a `{name,code,message,stack}`, sin `meta`, body ni headers.
- **R6** `CandidateFormPage.tsx`: fallback `document.getElementById(firstErrorField)?.focus()` para paths anidados de RHF.
- **R7** `CandidateFormPage.tsx`: `detail.field as FieldPath<CandidateFormValues>` (paths anidados tipados).
- **R8** `FormFieldError.tsx`: quitado `role="alert"` inline (se mantiene solo en el banner global).
- **R9** `candidate.controller.ts`: `Content-Disposition` RFC 5987 con `filename*=UTF-8''`.
- **R10** `app.test.ts`: `describe` renombrado a `App bootstrap`.

Verificación independiente que hice yo:
1. Backend bajado, BD reseteada (`prisma migrate reset`), `uploads/cvs/` limpiado, backend re-arrancado.
2. Smoke tests con curl:
   - `POST /api/candidates` con `{}` → **400** `VALIDATION_ERROR` con 3 errores por campo ✅
   - `POST /api/candidates` con mínimo válido nuevo → **201** ✅
   - `POST /api/candidates` con email duplicado y nombres válidos → **409** `EMAIL_ALREADY_EXISTS` ✅
   - `POST /api/candidates` con email malformado → **400** ✅
   - `GET /api/candidates/1` → **200** ✅
   - `GET /api/candidates/9999` → **404** ✅
3. `npx jest` backend → **42 passed / 0 failed** (4 suites). ✅
4. `npx jest` frontend → **17 passed / 0 failed** (4 suites). ✅

**Estado actual: aprobado para commit.** Los 14 CA están cumplidos en runtime y cubiertos por tests automáticos.

Mensaje de commit propuesto (consolidando todo el trabajo en un único commit):
```
feat(candidates): alta de candidatos con CV, educación y experiencia

Implementa la historia "Añadir Candidato al Sistema" (docs/historias/
01-anadir-candidato.md) cumpliendo los 14 CA y los 9 escenarios.

Backend (Express + TS + Prisma + Postgres):
- Modelos Candidate / Education / WorkExperience con onDelete: Cascade
  y migración add_candidate_education_experience.
- POST /api/candidates (multipart) con validación zod, multer
  diskStorage + UUID + filtro PDF/DOCX + límite 5 MB y verificación de
  magic numbers (%PDF- / PK\x03\x04) para evitar MIME falseado.
- Transacción atómica candidato + educaciones + experiencias con
  rollback del fichero si falla; cleanup también en LIMIT_FILE_SIZE
  (req.cvDiskPath registrado en el filename callback).
- GET /api/candidates/:id y GET /api/candidates/:id/cv con
  Content-Disposition RFC 5987 (filename* UTF-8) y validación
  defensiva de path para evitar traversal.
- Errores tipados: VALIDATION_ERROR / INVALID_FILE /
  EMAIL_ALREADY_EXISTS / INTERNAL_ERROR. Mapeo P2002 → 409.
- target tsconfig en es2017 para que instanceof discrimine clases
  extends Error.
- Logging redactado para no filtrar PII.
- Swagger en /api-docs. CORS limitado a FRONTEND_ORIGIN.
  express.json con límite 1mb.

Frontend (React + TS):
- Router con / (Dashboard) → /candidates/new (formulario) →
  /candidates/:id (detalle).
- react-hook-form + zod con espejo de las validaciones del servidor,
  useFieldArray para educación y experiencia, foco al primer error
  (con fallback document.getElementById) y mapeo de errores 409 al
  campo email.
- Feedback accesible: toast role=status, banner role=alert, labels
  asociados, aria-describedby, aria-invalid, focus ring.
- Detalle en read-only con link de descarga del CV.

Tests:
- Backend: 18 unit zod + 3 file-storage + 21 integración supertest
  cubriendo happy paths, errores de validación, duplicado, fichero
  inválido y descarga. 42/42 OK.
- Frontend: 17 component (RTL) cubriendo dashboard, formulario,
  estados de error y detalle. 17/17 OK.

Infra:
- backend/.env.example, backend/uploads/.gitkeep, .gitignore
  configurado para ignorar uploads salvo .gitkeep y .env.

Closes #01
```
