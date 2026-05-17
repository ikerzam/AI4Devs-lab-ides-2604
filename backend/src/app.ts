import express, { type Express } from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import candidateRoutes from './routes/candidate.routes';
import { errorHandler } from './middlewares/error.middleware';

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000';

export function createApp(): Express {
  const app = express();

  app.use(
    cors({
      origin: FRONTEND_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: false,
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'LTI ATS API',
        version: '0.1.0',
        description: 'API del Talent Tracking System de LTI',
      },
      servers: [{ url: 'http://localhost:3010' }],
    },
    apis: [
      path.join(__dirname, 'routes/*.ts'),
      path.join(__dirname, 'routes/*.js'),
    ],
  });

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.get('/', (_req, res) => {
    res.json({ status: 'ok', service: 'LTI ATS API' });
  });

  app.use('/api/candidates', candidateRoutes);

  app.use(errorHandler);

  return app;
}

export default createApp;
