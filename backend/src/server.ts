import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(`  SAIL KIOM Backend API running`);
  console.log(`  Port:      ${env.PORT}`);
  console.log(`  Base URL:  ${env.BASE_URL}`);
  console.log(`  Origin:    ${env.CORS_ORIGIN}`);
  console.log(`  Env:       ${env.NODE_ENV}`);
  console.log(`=========================================`);
});
