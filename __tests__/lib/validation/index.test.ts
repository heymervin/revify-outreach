import {
  emailDraftSchema,
  researchInputSchema,
  ghlConfigSchema,
  apiKeySchema,
  promptTemplateSchema,
  emailGenerationSchema,
  validateInput,
  safeValidate,
} from '@/lib/validation';

describe('Validation Schemas', () => {
  describe('emailDraftSchema', () => {
    it('should validate valid email draft', () => {
      const validDraft = {
        subject: 'Test Subject',
        body: 'Test email body content',
      };

      const result = emailDraftSchema.safeParse(validDraft);
      expect(result.success).toBe(true);
    });

    it('should reject empty subject', () => {
      const invalidDraft = {
        subject: '',
        body: 'Test body',
      };

      const result = emailDraftSchema.safeParse(invalidDraft);
      expect(result.success).toBe(false);
    });

    it('should reject subject over 200 chars', () => {
      const invalidDraft = {
        subject: 'a'.repeat(201),
        body: 'Test body',
      };

      const result = emailDraftSchema.safeParse(invalidDraft);
      expect(result.success).toBe(false);
    });

    it('should accept optional research_id', () => {
      const draft = {
        subject: 'Test',
        body: 'Body',
        research_id: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = emailDraftSchema.safeParse(draft);
      expect(result.success).toBe(true);
    });
  });

  describe('researchInputSchema', () => {
    it('should validate valid research input', () => {
      const validInput = {
        company_name: 'Test Company',
        company_website: 'https://example.com',
        industry: 'Technology',
        research_type: 'standard',
      };

      const result = researchInputSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject empty company name', () => {
      const invalidInput = {
        company_name: '',
        research_type: 'standard',
      };

      const result = researchInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should reject invalid research type', () => {
      const invalidInput = {
        company_name: 'Test',
        research_type: 'invalid',
      };

      const result = researchInputSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it('should default research_type to standard', () => {
      const input = {
        company_name: 'Test Company',
      };

      const result = researchInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.research_type).toBe('standard');
      }
    });

    it('should accept all valid research types', () => {
      const types = ['quick', 'standard', 'deep'];

      types.forEach((type) => {
        const result = researchInputSchema.safeParse({
          company_name: 'Test',
          research_type: type,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('ghlConfigSchema', () => {
    it('should validate valid GHL config', () => {
      const validConfig = {
        location_id: 'loc_12345',
        email_from: 'test@example.com',
      };

      const result = ghlConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject empty location_id', () => {
      const invalidConfig = {
        location_id: '',
      };

      const result = ghlConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidConfig = {
        location_id: 'loc_123',
        email_from: 'not-an-email',
      };

      const result = ghlConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('apiKeySchema', () => {
    it('should validate valid API key', () => {
      const validKey = {
        provider: 'openai',
        key: 'sk-1234567890abcdefghijklmnopqrstuvwxyz',
      };

      const result = apiKeySchema.safeParse(validKey);
      expect(result.success).toBe(true);
    });

    it('should reject invalid provider', () => {
      const invalidKey = {
        provider: 'invalid',
        key: 'sk-1234567890',
      };

      const result = apiKeySchema.safeParse(invalidKey);
      expect(result.success).toBe(false);
    });

    it('should reject short keys', () => {
      const invalidKey = {
        provider: 'openai',
        key: 'short',
      };

      const result = apiKeySchema.safeParse(invalidKey);
      expect(result.success).toBe(false);
    });

    it('should accept all valid providers', () => {
      const providers = ['openai', 'gemini', 'anthropic', 'tavily', 'ghl'];

      providers.forEach((provider) => {
        const result = apiKeySchema.safeParse({
          provider,
          key: 'a'.repeat(20),
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('promptTemplateSchema', () => {
    it('should validate valid prompt template', () => {
      const validPrompt = {
        name: 'My Research Prompt',
        type: 'research',
        content: 'This is a prompt template with {company_name} variable.',
        is_default: false,
      };

      const result = promptTemplateSchema.safeParse(validPrompt);
      expect(result.success).toBe(true);
    });

    it('should reject content under 10 chars', () => {
      const invalidPrompt = {
        name: 'Test',
        type: 'email',
        content: 'Short',
      };

      const result = promptTemplateSchema.safeParse(invalidPrompt);
      expect(result.success).toBe(false);
    });

    it('should default is_default to false', () => {
      const prompt = {
        name: 'Test Prompt',
        type: 'research',
        content: 'This is a test prompt template.',
      };

      const result = promptTemplateSchema.safeParse(prompt);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_default).toBe(false);
      }
    });
  });

  describe('emailGenerationSchema', () => {
    it('should validate valid email generation request', () => {
      const validRequest = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        persona: 'cfo_finance',
        tone: 'professional',
      };

      const result = emailGenerationSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidRequest = {
        session_id: 'not-a-uuid',
        persona: 'cfo_finance',
      };

      const result = emailGenerationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should reject invalid persona', () => {
      const invalidRequest = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        persona: 'invalid_persona',
      };

      const result = emailGenerationSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should default tone to professional', () => {
      const request = {
        session_id: '550e8400-e29b-41d4-a716-446655440000',
        persona: 'ceo_gm',
      };

      const result = emailGenerationSchema.safeParse(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tone).toBe('professional');
      }
    });
  });
});

describe('validateInput function', () => {
  it('should return data for valid input', () => {
    const result = validateInput(apiKeySchema, {
      provider: 'openai',
      key: 'sk-12345678901234567890',
    });

    expect(result.provider).toBe('openai');
    expect(result.key).toBe('sk-12345678901234567890');
  });

  it('should throw ValidationError for invalid input', () => {
    expect(() => {
      validateInput(apiKeySchema, {
        provider: 'invalid',
        key: 'short',
      });
    }).toThrow();
  });
});

describe('safeValidate function', () => {
  it('should return success: true for valid input', () => {
    const result = safeValidate(apiKeySchema, {
      provider: 'openai',
      key: 'sk-12345678901234567890',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe('openai');
    }
  });

  it('should return success: false with errors for invalid input', () => {
    const result = safeValidate(apiKeySchema, {
      provider: 'invalid',
      key: 'short',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveProperty('provider');
      expect(result.errors).toHaveProperty('key');
    }
  });
});
