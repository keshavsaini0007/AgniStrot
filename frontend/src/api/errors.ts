export class ApiError extends Error {
  status: number;
  code: string;
  errors: string[];

  constructor(message: string, status: number, code: string, errors: string[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors;
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    const { status, data } = error.response;
    const rawMessage = data?.message ?? data?.error;
    const safeMessage =
      typeof rawMessage === 'string' && rawMessage.length <= 200
        ? rawMessage
        : 'An error occurred';
    return new ApiError(
      safeMessage,
      status,
      data?.code || 'UNKNOWN_ERROR',
      Array.isArray(data?.errors) ? data.errors : []
    );
  }
  if (error.request) {
    return new ApiError(
      'Network error. Please check your connection.',
      0,
      'NETWORK_ERROR'
    );
  }
  return new ApiError(
    'An unexpected error occurred',
    0,
    'UNEXPECTED_ERROR'
  );
};