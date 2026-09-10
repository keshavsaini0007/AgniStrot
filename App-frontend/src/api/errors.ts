export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const handleApiError = (error: any): ApiError => {
  if (error.response) {
    const { status, data } = error.response;
    const message = data?.error || data?.message || 'Something went wrong';
    return new ApiError(message, status, data?.code);
  }
  if (error.request) {
    return new ApiError('Network error. Please check your connection.', 0);
  }
  return new ApiError(error.message || 'Unexpected error', 0);
};
