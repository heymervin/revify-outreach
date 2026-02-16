import { NextResponse } from 'next/server';

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error - user is not authenticated or token is invalid
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization error - user is authenticated but lacks permission
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Validation error - input data is invalid
 */
export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(
    message: string = 'Validation failed',
    errors: Record<string, string[]> = {}
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

/**
 * Not found error - requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * External service error - third-party API failure
 */
export class ExternalServiceError extends AppError {
  public readonly service: string;
  public readonly originalError?: Error;

  constructor(
    service: string,
    message: string = 'External service error',
    originalError?: Error
  ) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
    this.originalError = originalError;
  }
}

/**
 * Rate limit error - too many requests
 */
export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

/**
 * Insufficient credits error - user doesn't have enough credits
 */
export class InsufficientCreditsError extends AppError {
  public readonly creditsRequired: number;
  public readonly creditsAvailable: number;

  constructor(creditsRequired: number, creditsAvailable: number) {
    super(
      `Insufficient credits. Required: ${creditsRequired}, Available: ${creditsAvailable}`,
      402,
      'INSUFFICIENT_CREDITS'
    );
    this.creditsRequired = creditsRequired;
    this.creditsAvailable = creditsAvailable;
  }
}

/**
 * Configuration error - missing or invalid configuration
 */
export class ConfigurationError extends AppError {
  public readonly configKey: string;

  constructor(configKey: string, message?: string) {
    super(
      message || `Configuration missing or invalid: ${configKey}`,
      400,
      'CONFIGURATION_ERROR'
    );
    this.configKey = configKey;
  }
}

interface ErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Handles errors and returns appropriate NextResponse
 * Integrates with Sentry when available
 */
export function handleApiError(error: unknown): NextResponse<ErrorResponse> {
  // Log to console for debugging
  console.error('API Error:', error);

  // Report to Sentry if available (will be configured in sentry setup)
  if (typeof window === 'undefined') {
    // Server-side: try to import and use Sentry
    try {
      // Dynamic import to avoid issues if Sentry isn't installed yet
      const Sentry = require('@sentry/nextjs');
      if (error instanceof AppError && !error.isOperational) {
        Sentry.captureException(error);
      } else if (!(error instanceof AppError)) {
        Sentry.captureException(error);
      }
    } catch {
      // Sentry not installed yet, ignore
    }
  }

  // Handle known operational errors
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      error: error.message,
      code: error.code,
    };

    // Add validation errors if present
    if (error instanceof ValidationError && Object.keys(error.errors).length > 0) {
      response.details = { validation: error.errors };
    }

    // Add credits info if present
    if (error instanceof InsufficientCreditsError) {
      response.details = {
        credits_required: error.creditsRequired,
        credits_available: error.creditsAvailable,
      };
    }

    // Add rate limit info if present
    if (error instanceof RateLimitError && error.retryAfter) {
      return NextResponse.json(response, {
        status: error.statusCode,
        headers: { 'Retry-After': error.retryAfter.toString() },
      });
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  // Handle unknown errors
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return NextResponse.json(
    {
      error: message,
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

/**
 * Wraps an async API handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch((error) => handleApiError(error));
}

/**
 * Asserts a condition and throws appropriate error if false
 */
export function assertAuth(user: unknown, message?: string): asserts user {
  if (!user) {
    throw new AuthenticationError(message);
  }
}

export function assertFound<T>(value: T | null | undefined, resource: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new NotFoundError(resource);
  }
}

export function assertConfig<T>(
  value: T | null | undefined,
  configKey: string,
  message?: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new ConfigurationError(configKey, message);
  }
}
