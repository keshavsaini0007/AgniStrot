export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Smart Mine Governance',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API === 'true',
} as const;