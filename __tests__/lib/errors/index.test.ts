// Mock NextResponse before importing
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((body, init) => ({
      status: init?.status || 200,
      headers: new Headers(init?.headers),
      json: () => Promise.resolve(body),
    })),
  },
}));

import {
  AppError,
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  NotFoundError,
  ExternalServiceError,
  RateLimitError,
  InsufficientCreditsError,
  ConfigurationError,
  handleApiError,
  assertAuth,
  assertFound,
  assertConfig,
} from '@/lib/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error');

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.isOperational).toBe(true);
    });

    it('should create error with custom values', () => {
      const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', false);

      expect(error.message).toBe('Custom error');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CUSTOM_ERROR');
      expect(error.isOperational).toBe(false);
    });

    it('should be an instance of Error', () => {
      const error = new AppError('Test');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
    });
  });

  describe('AuthenticationError', () => {
    it('should create with default message', () => {
      const error = new AuthenticationError();

      expect(error.message).toBe('Authentication required');
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('AUTHENTICATION_ERROR');
    });

    it('should create with custom message', () => {
      const error = new AuthenticationError('Session expired');

      expect(error.message).toBe('Session expired');
    });
  });

  describe('AuthorizationError', () => {
    it('should create with default message', () => {
      const error = new AuthorizationError();

      expect(error.message).toBe('Insufficient permissions');
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('AUTHORIZATION_ERROR');
    });
  });

  describe('ValidationError', () => {
    it('should create with validation errors', () => {
      const errors = {
        email: ['Invalid email format'],
        name: ['Name is required', 'Name must be at least 2 characters'],
      };
      const error = new ValidationError('Validation failed', errors);

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.errors).toEqual(errors);
    });
  });

  describe('NotFoundError', () => {
    it('should create with resource name', () => {
      const error = new NotFoundError('User');

      expect(error.message).toBe('User not found');
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should use default resource name', () => {
      const error = new NotFoundError();

      expect(error.message).toBe('Resource not found');
    });
  });

  describe('ExternalServiceError', () => {
    it('should create with service name', () => {
      const error = new ExternalServiceError('OpenAI', 'Rate limit exceeded');

      expect(error.message).toBe('OpenAI: Rate limit exceeded');
      expect(error.statusCode).toBe(502);
      expect(error.code).toBe('EXTERNAL_SERVICE_ERROR');
      expect(error.service).toBe('OpenAI');
    });

    it('should store original error', () => {
      const original = new Error('Original');
      const error = new ExternalServiceError('OpenAI', 'Failed', original);

      expect(error.originalError).toBe(original);
    });
  });

  describe('RateLimitError', () => {
    it('should create with retry after', () => {
      const error = new RateLimitError('Too many requests', 60);

      expect(error.statusCode).toBe(429);
      expect(error.code).toBe('RATE_LIMIT_ERROR');
      expect(error.retryAfter).toBe(60);
    });
  });

  describe('InsufficientCreditsError', () => {
    it('should create with credit info', () => {
      const error = new InsufficientCreditsError(10, 5);

      expect(error.statusCode).toBe(402);
      expect(error.code).toBe('INSUFFICIENT_CREDITS');
      expect(error.creditsRequired).toBe(10);
      expect(error.creditsAvailable).toBe(5);
      expect(error.message).toContain('10');
      expect(error.message).toContain('5');
    });
  });

  describe('ConfigurationError', () => {
    it('should create with config key', () => {
      const error = new ConfigurationError('OPENAI_API_KEY');

      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('CONFIGURATION_ERROR');
      expect(error.configKey).toBe('OPENAI_API_KEY');
    });

    it('should allow custom message', () => {
      const error = new ConfigurationError('API_KEY', 'Please add your API key');

      expect(error.message).toBe('Please add your API key');
    });
  });
});

describe('handleApiError', () => {
  it('should return 401 for AuthenticationError', async () => {
    const error = new AuthenticationError();
    const response = handleApiError(error);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe('AUTHENTICATION_ERROR');
  });

  it('should return 400 for ValidationError with details', async () => {
    const error = new ValidationError('Invalid input', {
      email: ['Invalid format'],
    });
    const response = handleApiError(error);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.details).toHaveProperty('validation');
  });

  it('should return 402 for InsufficientCreditsError with details', async () => {
    const error = new InsufficientCreditsError(10, 5);
    const response = handleApiError(error);

    expect(response.status).toBe(402);
    const body = await response.json();
    expect(body.details).toEqual({
      credits_required: 10,
      credits_available: 5,
    });
  });

  it('should add Retry-After header for RateLimitError', async () => {
    const error = new RateLimitError('Too fast', 30);
    const response = handleApiError(error);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should handle unknown errors', async () => {
    const error = new Error('Unknown error');
    const response = handleApiError(error);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.code).toBe('INTERNAL_ERROR');
  });

  it('should handle non-Error objects', async () => {
    const response = handleApiError('string error');

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('An unexpected error occurred');
  });
});

describe('Assert functions', () => {
  describe('assertAuth', () => {
    it('should not throw for truthy value', () => {
      expect(() => assertAuth({ id: '123' })).not.toThrow();
    });

    it('should throw AuthenticationError for null', () => {
      expect(() => assertAuth(null)).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for undefined', () => {
      expect(() => assertAuth(undefined)).toThrow(AuthenticationError);
    });
  });

  describe('assertFound', () => {
    it('should not throw for truthy value', () => {
      expect(() => assertFound({ id: '123' }, 'User')).not.toThrow();
    });

    it('should throw NotFoundError for null', () => {
      expect(() => assertFound(null, 'User')).toThrow(NotFoundError);
    });
  });

  describe('assertConfig', () => {
    it('should not throw for truthy value', () => {
      expect(() => assertConfig('value', 'CONFIG_KEY')).not.toThrow();
    });

    it('should throw ConfigurationError for null', () => {
      expect(() => assertConfig(null, 'API_KEY')).toThrow(ConfigurationError);
    });
  });
});
