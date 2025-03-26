import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'expo',
  dbCredentials: {
    url: 'tf.db',
  },
} satisfies Config;