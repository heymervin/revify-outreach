import { http, HttpResponse } from 'msw';

// Mock responses for external APIs
export const handlers = [
  // OpenAI API mock
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'chatcmpl-test123',
      object: 'chat.completion',
      created: Date.now(),
      model: 'gpt-4o',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: JSON.stringify({
              company_profile: {
                confirmed_name: 'Test Company',
                industry: 'Technology',
                business_model: 'B2B SaaS',
              },
              recent_signals: [
                {
                  type: 'funding',
                  description: 'Recent Series A funding',
                  source: 'TechCrunch',
                  credibility_score: 0.9,
                },
              ],
              pain_point_hypotheses: [
                {
                  hypothesis: 'Scaling challenges with growth',
                  evidence: 'Recent hiring surge',
                },
              ],
              research_confidence: {
                overall_score: 0.8,
                gaps: [],
              },
            }),
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200,
        total_tokens: 300,
      },
    });
  }),

  // GoHighLevel Conversations API mock - Send message
  http.post('https://services.leadconnectorhq.com/conversations/messages', () => {
    return HttpResponse.json({
      messageId: 'msg_test123',
      id: 'msg_test123',
      conversationId: 'conv_test123',
      status: 'sent',
    });
  }),

  // GoHighLevel Contacts API mock - List contacts
  http.get('https://services.leadconnectorhq.com/contacts/', () => {
    return HttpResponse.json({
      contacts: [
        {
          id: 'contact_test123',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          companyName: 'Test Company',
        },
        {
          id: 'contact_test456',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          companyName: 'Test Company',
        },
      ],
      meta: {
        total: 2,
        currentPage: 1,
        nextPage: null,
      },
    });
  }),

  // GoHighLevel Custom Fields API mock
  http.get('https://services.leadconnectorhq.com/locations/:locationId/customFields', () => {
    return HttpResponse.json({
      customFields: [
        {
          id: 'cf_test123',
          name: 'Research Data',
          fieldKey: 'research_data',
          dataType: 'TEXT',
        },
      ],
    });
  }),

  // Tavily Search API mock
  http.post('https://api.tavily.com/search', () => {
    return HttpResponse.json({
      results: [
        {
          title: 'Test Company News',
          url: 'https://example.com/news',
          content: 'Test Company announced...',
          score: 0.95,
        },
      ],
      query: 'Test Company',
      response_time: 1.5,
    });
  }),

  // Error response mocks for testing error handling
  http.post('https://api.openai.com/v1/chat/completions/error', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded',
        },
      },
      { status: 429 }
    );
  }),

  http.post('https://services.leadconnectorhq.com/conversations/messages/error', () => {
    return HttpResponse.json(
      {
        message: 'Unauthorized',
        statusCode: 401,
      },
      { status: 401 }
    );
  }),
];

export const errorHandlers = [
  // Force OpenAI error
  http.post('https://api.openai.com/v1/chat/completions', () => {
    return HttpResponse.json(
      {
        error: {
          message: 'API key invalid',
          type: 'invalid_api_key',
        },
      },
      { status: 401 }
    );
  }),

  // Force GHL error
  http.post('https://services.leadconnectorhq.com/conversations/messages', () => {
    return HttpResponse.json(
      {
        message: 'Contact not found',
        statusCode: 404,
      },
      { status: 404 }
    );
  }),
];
