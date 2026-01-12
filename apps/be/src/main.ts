import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  /* eslint-disable turbo/no-undeclared-env-vars */
  const port = Number(process.env.PORT) || 3000;
  /* eslint-enable turbo/no-undeclared-env-vars */
  await app.listen(port);
}
// Avoid unhandled promise lint warning
void bootstrap();
