import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      SUPABASE_URL: 'https://placeholder.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'placeholder-service-role-key',
      ALLOWED_ORIGINS: 'http://localhost:5173',
    },
  },
});
