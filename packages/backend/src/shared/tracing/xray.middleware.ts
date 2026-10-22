/**
 * X-Ray Tracing - rastreamento distribuído para AWS X-Ray
 * [Traces: NFR-observabilidade, NFR-baixa-latencia]
 */

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Em produção, usar @aws-sdk/xray com AWS_XRAY_CONTEXT_MISSING e AWS_XRAY_DAEMON_ADDRESS
@Injectable()
export class XRayMiddleware implements NestMiddleware {
  private readonly logger = new Logger(XRayMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

    // Anexa headers de rastreamento na resposta
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('X-Trace-Start', start.toString());

    res.on('finish', () => {
      const duration = Date.now() - start;
      this.logger.log(
        `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
        { requestId, path: req.originalUrl, status: res.statusCode, durationMs: duration },
      );
    });

    next();
  }
}
