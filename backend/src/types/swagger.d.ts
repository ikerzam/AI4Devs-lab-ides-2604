// Minimal ambient declarations to avoid adding extra @types/* dependencies.
declare module 'swagger-jsdoc' {
  interface SwaggerJsdocOptions {
    definition: Record<string, unknown>;
    apis: string[];
  }
  function swaggerJsdoc(options: SwaggerJsdocOptions): Record<string, unknown>;
  export default swaggerJsdoc;
}

declare module 'swagger-ui-express' {
  import type { RequestHandler } from 'express';
  export const serve: RequestHandler[];
  export function setup(
    swaggerDoc: unknown,
    opts?: Record<string, unknown>,
    options?: Record<string, unknown>,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customeSiteTitle?: string,
  ): RequestHandler;
  const _default: { serve: RequestHandler[]; setup: typeof setup };
  export default _default;
}
