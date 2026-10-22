/**
 * Shared kernel — Exceções de domínio
 * [Traces: BR-*, NFR-*]
 */

export class DomainException extends Error {
  constructor(public readonly code: string, message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'DomainException';
  }
}

export class ForbiddenException extends DomainException {
  constructor(message: string) {
    super('forbidden', message, 403);
  }
}

export class NotFoundException extends DomainException {
  constructor(resource: string) {
    super('not_found', `${resource} não encontrado`, 404);
  }
}

export class ConflictException extends DomainException {
  constructor(message: string) {
    super('conflict', message, 409);
  }
}

export class IdempotencyConflictException extends DomainException {
  constructor(key: string) {
    super('idempotency_conflict', `Já existe processamento para a chave de idempotência ${key}`, 409);
  }
}
