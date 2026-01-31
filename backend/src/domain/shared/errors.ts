/**
 * Domain-level custom errors
 * These represent business rule violations and domain constraints
 */

export class DomainError extends Error {
  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, public field?: string) {
    super(message)
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super(id ? `${entity} with id ${id} not found` : `${entity} not found`)
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'Unauthorized access') {
    super(message)
  }
}

export class ForbiddenError extends DomainError {
  constructor(message: string = 'Forbidden: insufficient permissions') {
    super(message)
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super(message)
  }
}

export class BusinessRuleViolationError extends DomainError {
  constructor(message: string) {
    super(message)
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: string, to: string, entity: string = 'Entity') {
    super(`${entity} cannot transition from ${from} to ${to}`)
  }
}
