// Configuration file - loads from environment variables (.env file)
// Node.js natively loads .env files when using --env-file flag
export default {
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'reports_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  storage: {
    directory: process.env.STORAGE_DIR || './storage/reports'
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    user: process.env.EMAIL_USER || 'user@ethereal.email',
    pass: process.env.EMAIL_PASS || 'password',
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },
  app: {
    port: parseInt(process.env.APP_PORT || '3000'),
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000'
  }
};
