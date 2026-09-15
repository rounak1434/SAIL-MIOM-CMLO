import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const getEnv = (key: string, fallback: string): string => {
  const val = process.env[key];
  if (!val || val.trim() === '' || val.trim() === '/') return fallback;
  return val.trim();
};

export const env = {
  PORT: parseInt(getEnv('PORT', '8000'), 10),
  BASE_URL: getEnv('BASE_URL', 'http://localhost:8000'),
  CORS_ORIGIN: getEnv('CORS_ORIGIN', 'http://localhost:5173'),
  DATABASE_URL: getEnv('DATABASE_URL', 'file:./sail_kiom.db'),
  JWT_SECRET: getEnv('JWT_SECRET', 'sail_kiom_super_secret_jwt_key_2026_dev_only'),
  JWT_EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '7d'),
  NODE_ENV: getEnv('NODE_ENV', 'development') as 'development' | 'production' | 'test',
};
