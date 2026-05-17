import { Router } from 'express';
import { uploadCv } from '../middlewares/upload.middleware';
import {
  getCandidate,
  getCandidateCv,
  postCandidate,
} from '../controllers/candidate.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Candidates
 *     description: Gestión de candidatos
 */

/**
 * @swagger
 * /api/candidates:
 *   post:
 *     summary: Crea un candidato (datos personales, formación, experiencia y CV opcional)
 *     tags: [Candidates]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *             properties:
 *               data:
 *                 type: string
 *                 description: |
 *                   JSON stringificado con el candidato. Estructura:
 *                   {
 *                     firstName, lastName, email, phone?,
 *                     address?: { street?, city?, postalCode?, country? },
 *                     educations?: [{ institution, degree, fieldOfStudy?, startDate, endDate? }],
 *                     experiences?: [{ company, position, description?, startDate, endDate? }]
 *                   }
 *               cv:
 *                 type: string
 *                 format: binary
 *                 description: Fichero PDF o DOCX, máx 5 MB.
 *     responses:
 *       201:
 *         description: Candidato creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: integer }
 *                 firstName: { type: string }
 *                 lastName: { type: string }
 *                 email: { type: string }
 *                 cvUrl: { type: string, nullable: true }
 *                 createdAt: { type: string, format: date-time }
 *       400:
 *         description: VALIDATION_ERROR o INVALID_FILE
 *       409:
 *         description: EMAIL_ALREADY_EXISTS
 *       500:
 *         description: INTERNAL_ERROR
 */
router.post('/', uploadCv, postCandidate);

/**
 * @swagger
 * /api/candidates/{id}:
 *   get:
 *     summary: Recupera un candidato por id
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Candidato encontrado
 *       404:
 *         description: No encontrado
 */
router.get('/:id', getCandidate);

/**
 * @swagger
 * /api/candidates/{id}/cv:
 *   get:
 *     summary: Descarga el CV de un candidato
 *     tags: [Candidates]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Stream del fichero
 *       404:
 *         description: CV no encontrado
 */
router.get('/:id/cv', getCandidateCv);

export default router;
