/**
 * Middleware de auditoria — @AuditAction
 * [Traces: NFR-audit, NFR-rls]
 *
 * Acionado em toda leitura de PII e mudança de estágio, taxa ou limite de crédito.
 * Gravado em S3 Object Lock (retentação 5 anos).
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuditMiddleware.name);

  use(req: any, res: any, next: () => void) {
    const start = Date.now();
    res.on('finish', () => {
      // Em produção: gravar em S3 Object Lock com ação extraída do contexto
      this.logger.log(JSON.stringify({
        method: req.method,
        path: req.url,
        actorId: req.user?.sub,
        organizationId: req.headers['x-organization-id'],
        statusCode: res.statusCode,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      }));
    });
    next();
  }
}
