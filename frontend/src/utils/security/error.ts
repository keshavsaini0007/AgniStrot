const GENERIC_MESSAGES: Record<number, string> = {
  400: 'Invalid request. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may have been modified.',
  422: 'The submitted data is invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again later.',
  502: 'Service temporarily unavailable. Please try again later.',
  503: 'Service is currently unavailable. Please try again later.',
};

export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  if (typeof error === 'string') return 'An error occurred.';

  if (error instanceof Error) {
    const apiError = error as unknown as Record<string, unknown>;
    const status = typeof apiError.status === 'number' ? apiError.status : undefined;

    if (status && GENERIC_MESSAGES[status]) {
      return GENERIC_MESSAGES[status];
    }

    if (status && status >= 500) {
      return GENERIC_MESSAGES[500];
    }
  }

  return 'Something went wrong. Please try again.';
}

export function sanitizeApiMessage(rawMessage: unknown): string {
  if (typeof rawMessage !== 'string') return 'An error occurred.';
  if (rawMessage.length > 200) return 'An error occurred.';
  return rawMessage;
}
