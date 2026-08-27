import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.enableCors({ origin: config.get('CORS_ORIGIN') ?? 'http://localhost:5173' });

  const port = config.get('PORT') ?? 3000;
  await app.listen(port);
  console.log(`Harrix ERP backend listening on http://localhost:${port}/api`);
}
await bootstrap();
