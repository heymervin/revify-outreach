// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out certain errors
  beforeSend(event, hint) {
    const error = hint.originalException as Error;

    // Don't report authentication errors (expected behavior)
    if (error?.message?.includes('Unauthorized') ||
        error?.message?.includes('Authentication required')) {
      return null;
    }

    // Don't report validation errors (user input issues)
    if (error?.name === 'ValidationError') {
      return null;
    }

    return event;
  },

  // Add environment tag
  environment: process.env.NODE_ENV,

  // Capture unhandled promise rejections
  integrations: [
    Sentry.captureConsoleIntegration({
      levels: ['error'],
    }),
  ],
});
