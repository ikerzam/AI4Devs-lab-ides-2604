# Historia de usuario refinada: Añadir Candidato al Sistema

## Como reclutador, quiero añadir candidatos al sistema ATS (datos personales, formación, experiencia y CV adjunto), para gestionar de forma centralizada y eficiente sus procesos de selección.

## Contexto y motivación
Actualmente LTI no dispone de un mecanismo para registrar candidatos: el esquema Prisma solo contiene el modelo `User` y el backend Express expone únicamente un endpoint raíz de prueba. Para que el ATS sea utilizable, lo primero es habilitar el alta manual de candidatos con sus datos básicos, formación, experiencia y un CV adjunto. Esta historia es la base sobre la que se construirán futuras funcionalidades (listado, búsqueda, pipeline de selección, etc.).

## Criterios de aceptación (testables)
- [ ] CA1: Desde la pantalla principal (dashboard) existe un botón visible con el texto "Añadir candidato" que navega a la pantalla/formulario de alta (`/candidates/new`).
- [ ] CA2: El formulario contiene, como mínimo, los campos: nombre, apellidos, email, teléfono, dirección (calle, ciudad, código postal, país), bloque repetible de educación, bloque repetible de experiencia laboral y carga de CV.
- [ ] CA3: Al enviar el formulario con datos válidos, el sistema persiste el candidato y devuelve HTTP 201 con el `id` y los datos creados.
- [ ] CA4: Al enviar el formulario con datos válidos, el usuario ve un mensaje de éxito accesible (`role="status"` o `aria-live="polite"`) "Candidato añadido correctamente" y el formulario se resetea o redirige al detalle del candidato.
- [ ] CA5: Si falta un campo obligatorio (nombre, apellidos, email), el formulario muestra el mensaje de error junto al campo y NO realiza la petición al backend.
- [ ] CA6: Si el email tiene un formato inválido, se muestra "Introduce un email válido" y no se envía la petición.
- [ ] CA7: Si el email ya existe en la base de datos, el backend responde HTTP 409 y el frontend muestra "Ya existe un candidato con ese email".
- [ ] CA8: El campo CV solo acepta `application/pdf` y `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), y un tamaño máximo de 5 MB. En caso contrario se muestra error sin enviar la petición.
- [ ] CA9: El backend revalida MIME, extensión y tamaño del fichero; si no cumple, responde HTTP 400 con código de error `INVALID_FILE`.
- [ ] CA10: Si el servidor no está disponible o falla (timeout, 5xx), el frontend muestra "No se pudo guardar el candidato. Inténtalo de nuevo." y mantiene los datos del formulario.
- [ ] CA11: Todos los inputs tienen `<label>` asociado vía `htmlFor`/`id`. Los errores se vinculan con `aria-describedby` y `aria-invalid="true"`.
- [ ] CA12: El formulario es navegable completamente por teclado (Tab/Shift+Tab) y el foco se mueve automáticamente al primer error tras un envío fallido.
- [ ] CA13: Educación y experiencia permiten añadir N entradas (botón "Añadir formación" / "Añadir experiencia") y eliminar entradas individuales.
- [ ] CA14: El endpoint `POST /api/candidates` está documentado en Swagger (`/api-docs`).

## Escenarios (Gherkin)

### Escenario 1: Camino feliz - alta de candidato con CV PDF
  Dado que soy un reclutador y estoy en `/candidates/new`
  Cuando completo nombre="Ana", apellidos="García", email="ana@example.com", teléfono="+34600111222", añado 1 formación y 1 experiencia válidas, adjunto "cv.pdf" (1 MB) y pulso "Guardar"
  Entonces el frontend envía `multipart/form-data` a `POST /api/candidates`
  Y el backend responde HTTP 201 con el candidato creado
  Y veo el mensaje "Candidato añadido correctamente"
  Y soy redirigido a `/candidates/:id` (o vuelvo al dashboard, según DEC4)

### Escenario 2: Email duplicado
  Dado que ya existe un candidato con email "ana@example.com"
  Cuando intento crear otro candidato con el mismo email
  Entonces el backend responde HTTP 409 con `{ "error": "EMAIL_ALREADY_EXISTS" }`
  Y el frontend muestra "Ya existe un candidato con ese email" junto al campo email
  Y el resto del formulario conserva los valores introducidos

### Escenario 3: Campos obligatorios vacíos
  Dado que estoy en el formulario de alta
  Cuando pulso "Guardar" sin rellenar nombre ni email
  Entonces no se realiza ninguna petición al backend
  Y aparecen los mensajes "El nombre es obligatorio" y "El email es obligatorio"
  Y el foco se posiciona en el primer campo con error (nombre)

### Escenario 4: Email con formato inválido
  Dado que estoy en el formulario de alta
  Cuando introduzco email="ana@" y pulso "Guardar"
  Entonces aparece "Introduce un email válido" bajo el campo email
  Y no se realiza ninguna petición al backend

### Escenario 5: CV con tipo no permitido
  Dado que estoy en el formulario de alta
  Cuando adjunto "foto.jpg"
  Entonces el campo de CV muestra "Solo se permiten ficheros PDF o DOCX"
  Y el botón "Guardar" no envía la petición hasta que se corrige

### Escenario 6: CV demasiado grande
  Dado que estoy en el formulario de alta
  Cuando adjunto un PDF de 10 MB
  Entonces se muestra "El fichero no puede superar 5 MB"
  Y no se envía la petición

### Escenario 7: Backend caído
  Dado que el backend no responde (timeout o 5xx)
  Cuando envío el formulario con datos válidos
  Entonces el frontend muestra "No se pudo guardar el candidato. Inténtalo de nuevo."
  Y los datos del formulario no se pierden

### Escenario 8: Añadir y eliminar entradas de educación
  Dado que estoy en el formulario de alta
  Cuando pulso "Añadir formación" dos veces y relleno ambas
  Y pulso el botón eliminar de la segunda entrada
  Entonces queda una única entrada de formación visible en el formulario y se envía al backend

### Escenario 9: Fechas de experiencia laboral incoherentes
  Dado que añado una experiencia con `startDate=2023-01-01` y `endDate=2022-01-01`
  Cuando pulso "Guardar"
  Entonces se muestra "La fecha de fin debe ser posterior a la de inicio"
  Y no se realiza la petición

## Especificación funcional

### Campos / validaciones

#### Datos personales
| Campo | Tipo | Obligatorio | Validación | Mensaje de error |
|-------|------|-------------|------------|------------------|
| firstName | string | Sí | 2-50 caracteres, trim | "El nombre es obligatorio" / "Máx. 50 caracteres" |
| lastName | string | Sí | 2-100 caracteres, trim | "Los apellidos son obligatorios" |
| email | string | Sí | RFC 5322 simplificado, único en BD, máx. 255 | "Introduce un email válido" / "Ya existe un candidato con ese email" |
| phone | string | No | E.164 o nacional, 7-20 caracteres, dígitos, `+`, espacios y guiones | "Introduce un teléfono válido" |
| addressStreet | string | No | máx. 150 | - |
| addressCity | string | No | máx. 100 | - |
| addressPostalCode | string | No | máx. 20 | - |
| addressCountry | string | No | ISO 3166-1 alpha-2 (ej. `ES`) | "País no válido" |

#### Educación (array, 0..N)
| Campo | Tipo | Obligatorio | Validación | Mensaje |
|-------|------|-------------|------------|---------|
| institution | string | Sí (si se añade el bloque) | 2-150 | "La institución es obligatoria" |
| degree | string | Sí | 2-150 | "El título es obligatorio" |
| fieldOfStudy | string | No | máx. 150 | - |
| startDate | date (YYYY-MM-DD) | Sí | <= hoy | "Fecha inválida" |
| endDate | date | No | > startDate; null = "en curso" | "La fecha de fin debe ser posterior a la de inicio" |

#### Experiencia laboral (array, 0..N)
| Campo | Tipo | Obligatorio | Validación | Mensaje |
|-------|------|-------------|------------|---------|
| company | string | Sí | 2-150 | "La empresa es obligatoria" |
| position | string | Sí | 2-150 | "El puesto es obligatorio" |
| description | string | No | máx. 1000 | - |
| startDate | date | Sí | <= hoy | "Fecha inválida" |
| endDate | date | No | > startDate; null = "actual" | "La fecha de fin debe ser posterior a la de inicio" |

#### CV
| Campo | Tipo | Obligatorio | Validación | Mensaje |
|-------|------|-------------|------------|---------|
| cv | File | No (recomendado) | MIME `application/pdf` o `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; extensión `.pdf` o `.docx`; tamaño <= 5 MB | "Solo se permiten PDF o DOCX" / "El fichero no puede superar 5 MB" |

### Reglas de negocio
- RN1: El email identifica de forma única a un candidato.
- RN2: Se pueden registrar candidatos sin teléfono, dirección, formación, experiencia ni CV (solo nombre, apellidos y email son obligatorios). Ver DEC2.
- RN3: Educación y experiencia son colecciones independientes asociadas a un candidato; se persisten en tablas separadas (relación 1:N). Ver DEC3.
- RN4: El CV se almacena fuera de la base de datos relacional (filesystem local en `uploads/cvs/` en MVP) y se referencia desde la tabla `Candidate` mediante `cvFilePath`, `cvOriginalName`, `cvMimeType`, `cvSizeBytes`. Ver DEC5.
- RN5: Los nombres de fichero se generan con UUID v4 para evitar colisiones y path traversal; el nombre original se conserva como metadato.
- RN6: Las fechas se almacenan en UTC; el frontend muestra en zona local.

### Errores y casos borde
- Email duplicado -> 409 `EMAIL_ALREADY_EXISTS`.
- Validación de payload fallida -> 400 `VALIDATION_ERROR` con detalle por campo.
- Fichero inválido (MIME/tamaño/extensión) -> 400 `INVALID_FILE`.
- Fichero corrupto o no legible al guardar -> 500 `FILE_WRITE_ERROR` y rollback de la transacción (no se crea el candidato).
- Petición sin `Content-Type: multipart/form-data` cuando se intenta subir CV -> 400.
- Caracteres unicode en nombres (acentos, ñ, etc.) deben aceptarse correctamente.
- Doble submit (doble click): el botón "Guardar" se deshabilita durante la petición.
- Pérdida de conexión durante la subida -> mostrar error y permitir reintento.

## Especificación técnica

### Estado actual del repo (verificado)
- `backend/prisma/schema.prisma`: solo modelo `User`. **Hay que añadir** `Candidate`, `Education`, `WorkExperience`.
- `backend/src/index.ts`: Express básico, sin rutas modulares, sin middlewares de parsing (`express.json`), sin CORS, sin multer, sin validador.
- `backend/package.json`: ya incluye `swagger-jsdoc`, `swagger-ui-express`, `@prisma/client`, `express`. **Falta instalar**: `multer`, `@types/multer`, `cors`, `@types/cors`, `zod` (o `express-validator`), `uuid`, `@types/uuid`.
- `frontend/package.json`: CRA limpio. **Falta instalar**: `react-router-dom`, `axios` (o usar `fetch`), `react-hook-form` + `zod` + `@hookform/resolvers` (recomendado para validación y a11y).
- No existe autenticación ni modelo `Recruiter`. Ver DEC1.

### Backend

#### Cambios en schema Prisma (a añadir, no romper `User`)
```prisma
model Candidate {
  id                Int       @id @default(autoincrement())
  firstName         String
  lastName          String
  email             String    @unique
  phone             String?
  addressStreet     String?
  addressCity       String?
  addressPostalCode String?
  addressCountry    String?   // ISO alpha-2
  cvFilePath        String?
  cvOriginalName    String?
  cvMimeType        String?
  cvSizeBytes       Int?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  educations        Education[]
  experiences       WorkExperience[]
}

model Education {
  id           Int       @id @default(autoincrement())
  candidateId  Int
  candidate    Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  institution  String
  degree       String
  fieldOfStudy String?
  startDate    DateTime
  endDate      DateTime?
}

model WorkExperience {
  id          Int       @id @default(autoincrement())
  candidateId Int
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  company     String
  position    String
  description String?
  startDate   DateTime
  endDate     DateTime?
}
```

#### Migraciones
- `npx prisma migrate dev --name add_candidate_education_experience`.

#### Endpoints
| Método | Ruta | Content-Type | Descripción |
|--------|------|--------------|-------------|
| POST | `/api/candidates` | `multipart/form-data` | Crea candidato + educación + experiencia + CV |
| GET | `/api/candidates/:id` | `application/json` | (Opcional para esta historia) Recupera candidato. Recomendado para la redirección tras crear. |

**Request `POST /api/candidates` (multipart)**:
- Campo `data` (JSON stringificado) con el cuerpo del candidato:
```json
{
  "firstName": "Ana",
  "lastName": "García",
  "email": "ana@example.com",
  "phone": "+34600111222",
  "address": {
    "street": "Calle Mayor 1",
    "city": "Madrid",
    "postalCode": "28001",
    "country": "ES"
  },
  "educations": [
    {
      "institution": "UPM",
      "degree": "Grado Informática",
      "fieldOfStudy": "Software",
      "startDate": "2018-09-01",
      "endDate": "2022-06-30"
    }
  ],
  "experiences": [
    {
      "company": "Acme",
      "position": "Backend Dev",
      "description": "APIs con Node",
      "startDate": "2022-07-01",
      "endDate": null
    }
  ]
}
```
- Campo `cv` (File, opcional): PDF o DOCX, <= 5 MB.

**Responses**:
- `201 Created`:
```json
{
  "id": 12,
  "firstName": "Ana",
  "lastName": "García",
  "email": "ana@example.com",
  "cvUrl": "/api/candidates/12/cv",
  "createdAt": "2026-05-17T10:00:00.000Z"
}
```
- `400 VALIDATION_ERROR`:
```json
{ "error": "VALIDATION_ERROR", "details": [{ "field": "email", "message": "Introduce un email válido" }] }
```
- `400 INVALID_FILE` (mime/size/extension).
- `409 EMAIL_ALREADY_EXISTS`.
- `500 INTERNAL_ERROR` (incluye `FILE_WRITE_ERROR`).

#### Estructura sugerida de carpetas backend
```
backend/src/
  index.ts
  app.ts                       (configuración de Express, CORS, JSON, swagger, error handler)
  routes/
    candidate.routes.ts
  controllers/
    candidate.controller.ts
  services/
    candidate.service.ts
    file-storage.service.ts
  middlewares/
    upload.middleware.ts       (multer: límites + filtro MIME)
    error.middleware.ts
  schemas/
    candidate.schema.ts        (zod)
  prisma/
    client.ts
```

#### Middlewares y librerías
- `multer` con `diskStorage`, destino `uploads/cvs/`, `limits: { fileSize: 5 * 1024 * 1024 }`, `fileFilter` que valida MIME (`application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
- `zod` para validar el JSON del body.
- `cors` para permitir el origen del frontend (CRA en `http://localhost:3000`).
- Añadir `app.use(express.json({ limit: '1mb' }))` y `app.use('/uploads', express.static(...))` solo si se sirve el CV (alternativa: endpoint dedicado).

#### Transaccionalidad
- Crear candidato + educación + experiencia en una `prisma.$transaction`. Si la escritura del fichero falla previamente, no se inicia la transacción; si la transacción falla tras guardar el fichero, eliminar el fichero del disco (`fs.unlink`) para evitar huérfanos.

#### Swagger
- Documentar el endpoint en `/api-docs` usando `swagger-jsdoc` ya disponible.

### Frontend

#### Rutas / pantallas
- `/` -> Dashboard con botón "Añadir candidato".
- `/candidates/new` -> Formulario de alta.
- `/candidates/:id` -> Pantalla de confirmación/detalle simple tras crear (opcional, ver DEC4).

#### Componentes nuevos
- `DashboardPage` (con botón/CTA "Añadir candidato").
- `CandidateFormPage`.
- `CandidatePersonalDataSection`.
- `AddressSection`.
- `EducationListSection` + `EducationItem` (repetible).
- `ExperienceListSection` + `ExperienceItem` (repetible).
- `CvUploadField`.
- `FormFieldError` (componente accesible reutilizable).
- `Toast` / `Alert` para feedback global.

#### Librerías recomendadas
- `react-router-dom` para enrutado.
- `react-hook-form` + `zod` + `@hookform/resolvers/zod` para validación cliente sincronizada con el backend.
- `axios` para la llamada `multipart/form-data`.

#### Estados de UI
- **Idle**: formulario editable.
- **Submitting**: botón "Guardar" deshabilitado con spinner, resto de inputs deshabilitados.
- **Success**: toast "Candidato añadido correctamente" + redirección a `/candidates/:id` o reset del formulario.
- **Error de validación**: errores inline por campo, foco al primero, toast genérico opcional.
- **Error de red/servidor**: banner superior con mensaje "No se pudo guardar el candidato. Inténtalo de nuevo."
- **Vacío**: estado inicial; secciones repetibles muestran botón "Añadir formación"/"Añadir experiencia".

#### Accesibilidad (WCAG 2.1 AA)
- Cada input con `<label htmlFor>` visible (no solo placeholder).
- Mensajes de error con `id` referenciado por `aria-describedby` del input.
- `aria-invalid="true"` en inputs con error.
- Mensajes de éxito/error globales con `role="status"` (`aria-live="polite"`) o `role="alert"` (`aria-live="assertive"`) según severidad.
- Botones de añadir/eliminar entradas con `aria-label` descriptivo ("Eliminar formación 2").
- Orden de tabulación lógico; foco gestionado tras envío fallido (focus al primer error) y exitoso (focus al toast o al heading de detalle).
- Contraste mínimo 4.5:1 en textos.
- Tamaño objetivo de click >= 44x44px en móvil.
- Probado con teclado y con lector de pantalla (NVDA o VoiceOver) - smoke test.

### Datos de prueba

#### Payload válido (campos mínimos)
```json
{ "firstName": "Ana", "lastName": "García", "email": "ana@example.com" }
```

#### Payload válido (completo)
Ver ejemplo en la sección de endpoints.

#### Payloads inválidos
- Email vacío -> 400 con `field=email`.
- Email = "no-es-email" -> 400.
- `educations[0].endDate < educations[0].startDate` -> 400.
- CV `image/png` 200 KB -> 400 `INVALID_FILE`.
- CV PDF 6 MB -> 400 `INVALID_FILE`.

## Definición de hecho (DoD)
- [ ] Código revisado por un par (PR aprobado).
- [ ] Tests unitarios del servicio `candidate.service` y del validador zod (>= 80% cobertura del módulo nuevo).
- [ ] Tests de integración (`supertest`) del endpoint `POST /api/candidates`: happy path, email duplicado, validación, fichero inválido, fichero válido.
- [ ] Validaciones replicadas en cliente y servidor (zod compartido o equivalente).
- [ ] Manejo de errores y feedback al usuario implementado y verificado a mano.
- [ ] Sin warnings en consola del navegador ni del servidor.
- [ ] Documentación Swagger del endpoint accesible en `/api-docs`.
- [ ] Migración de Prisma aplicada y commit del fichero de migración.
- [ ] `uploads/` añadido a `.gitignore`.
- [ ] Smoke test de accesibilidad con teclado y axe-core sin violations críticas.
- [ ] README actualizado con instrucciones para levantar backend + frontend juntos.

## Dependencias y riesgos
- **Dependencia D1**: No existe autenticación. Sin un `Recruiter` autenticado no se puede vincular el candidato a quien lo creó. Ver DEC1.
- **Dependencia D2**: No existe modelo `Recruiter` ni pantalla de login.
- **Dependencia D3**: Hace falta CORS y middleware JSON; aún no están configurados.
- **Riesgo R1**: Almacenar CVs en filesystem local no escala a múltiples instancias ni a despliegues serverless. Aceptable solo en MVP local.
- **Riesgo R2**: Tamaño de uploads grandes puede saturar memoria si no se usa `diskStorage`. Mitigación: `multer.diskStorage` desde el principio.
- **Riesgo R3**: PII (datos personales del candidato). Cumplimiento RGPD pendiente (consentimiento, derecho de borrado, cifrado en reposo). Fuera del alcance del MVP pero anótese como deuda.
- **Riesgo R4**: Sin antivirus en uploads, riesgo de que el sistema almacene malware. Mitigación futura: integrar ClamAV o servicio externo.

## Decisiones pendientes

- **DEC1 - Autenticación / asociación a reclutador**: 
  - Recomendación: en este MVP **asumir un único reclutador implícito** y NO añadir relación `Candidate.recruiterId` todavía. Documentarlo como deuda.
  - Alternativa: introducir ya `Recruiter` con un seed de un único usuario y `candidate.recruiterId` obligatorio (más coste, prepara mejor el terreno).

- **DEC2 - Obligatoriedad de campos**: 
  - Recomendación: hacer obligatorios solo `firstName`, `lastName`, `email`. Todo lo demás opcional para no bloquear cargas rápidas.
  - Alternativa: exigir también teléfono y al menos una experiencia (más datos, más fricción).

- **DEC3 - Educación y experiencia: tablas relacionadas vs JSON**: 
  - Recomendación: **tablas relacionadas** (`Education`, `WorkExperience`) por escalabilidad, futura búsqueda/filtro y normalización. Coste de migración bajo ahora que no hay datos.
  - Alternativa: columnas `Json` en `Candidate`. Más simple en MVP pero limita búsqueda y validación a nivel de BD.

- **DEC4 - Comportamiento tras crear**: 
  - Recomendación: redirigir a `/candidates/:id` con un toast de éxito. Refuerza que se ha creado y permite continuar.
  - Alternativa: volver al dashboard y mostrar toast.

- **DEC5 - Almacenamiento del CV**: 
  - Recomendación: **filesystem local** en `backend/uploads/cvs/<uuid>.<ext>` para MVP, con metadatos en BD. Sencillo, sin coste, suficiente para entorno local.
  - Alternativa A: BYTEA en Postgres (simplifica backup pero infla la BD y limita streaming).
  - Alternativa B: S3-compatible (más profesional, pero excede el alcance).

- **DEC6 - Tamaño máximo del CV**: 
  - Recomendación: 5 MB. Equilibrio razonable para PDF/DOCX típicos.
  - Alternativa: 10 MB.

- **DEC7 - Autocompletado de educación/experiencia (de la historia original)**: 
  - Recomendación: **fuera de alcance** en esta historia. Crear historia separada cuando exista volumen de datos para sugerir.
  - Alternativa: incluir autocomplete simple consultando un endpoint `/api/suggestions?field=institution&q=...` (incrementa el alcance significativamente).

- **DEC8 - Verificación de email del candidato**: 
  - Recomendación: no verificar (no hay flujo de email aún). El reclutador asume la validez.
  - Alternativa: enviar email de confirmación (requiere infraestructura SMTP).

## Estimación

**Talla: L**

Justificación: 
- Backend nuevo desde cero (rutas, controlador, servicio, multer, validación zod, swagger, transacción Prisma con 3 tablas, gestión de ficheros y rollback).
- Migración Prisma con 3 nuevos modelos.
- Frontend nuevo prácticamente desde cero (router, formulario complejo con secciones repetibles, validación, accesibilidad, gestión de upload).
- Tests unitarios y de integración.
- No hay autenticación que complique, lo que evita XL.

### Propuesta de split (si se quisiera reducir a M+M)
- **Historia 1a (M)**: Backend - modelo Candidate básico + endpoint `POST /api/candidates` JSON (sin CV, sin educación, sin experiencia) + Swagger + tests.
- **Historia 1b (M)**: Frontend - dashboard + formulario de alta básico (datos personales) consumiendo 1a + accesibilidad.
- **Historia 1c (M)**: Añadir educación y experiencia (modelos, endpoints anidados, UI repetible).
- **Historia 1d (M)**: Carga de CV (multer, almacenamiento, validación MIME/tamaño, UI de upload).

---

## ✅ Decisiones cerradas (acordadas con el usuario)

- **DEC1 → Único reclutador implícito**. No se añade modelo `Recruiter` ni FK en `Candidate`. Sin autenticación.
- **Alcance → Todo en una pasada (L)**. No troceamos en 4 historias M.
- **DEC4 → Toast + redirigir a `/candidates/:id`**. Hay que implementar también `GET /api/candidates/:id` y una pantalla mínima de detalle (solo lectura).
- **DoD → Tests automáticos sí**: integración (supertest) + unitarios + componente (RTL).
- **DEC2 → Obligatorios: `firstName`, `lastName`, `email`** (recomendación del refinamiento).
- **DEC3 → Tablas relacionadas** para educación/experiencia (recomendación).
- **DEC5 → Filesystem local** `backend/uploads/cvs/<uuid>.ext` (recomendación).
- **DEC6 → Tamaño máximo CV: 5 MB** (recomendación).
- **DEC7 → Autocompletado de educación/experiencia: fuera de alcance** (historia aparte).
- **DEC8 → Sin verificación de email del candidato** (recomendación).
