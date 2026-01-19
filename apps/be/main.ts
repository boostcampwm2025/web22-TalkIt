import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import '@/common/utils/zod-openapi';

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './src/common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.enableCors({
    origin: ['http://localhost:5173', 'http://211.188.54.88'],
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Talkit API')
    .setDescription('Talkit 백엔드 API 문서')
    .setVersion('1.0')
    // .addBearerAuth() // JWT 쓰면 추후 설정
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}

bootstrap();
