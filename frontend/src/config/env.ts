export const env = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'Smart Mine Governance',
  APP_ENV: import.meta.env.VITE_APP_ENV || 'development',
  USE_MOCK_API: import.meta.env.VITE_USE_MOCK_API === 'true',
  /**
   * Toggles pitch-only demo screens that have no backend counterpart
   * (Mines catalog, Corrective Actions manager, Compliance matrix, Notifications).
   * Set to true together with VITE_USE_MOCK_API=true for the sales demo.
   */
  DEMO_FEATURES: import.meta.env.VITE_DEMO_FEATURES === 'true',
} as const;