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
    return new ApiError(
      data.message || 'An error occurred',
      status,
      data.code || 'UNKNOWN_ERROR',
      data.errors || []
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
    error.message || 'An unexpected error occurred',
    0,
    'UNEXPECTED_ERROR'
  );
};