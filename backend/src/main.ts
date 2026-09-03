import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';

/**
 * The placeholder shipped in .env.example. It is committed to the repository,
 * so a server running on it is not authenticated at all: anyone holding a copy
 * of the source can sign a token for any account, including the gérant.
 * Refusing to boot is the only safe response — a warning would be ignored.
 */
const PLACEHOLDER_JWT_SECRET = 'changez-moi-par-une-longue-chaine-aleatoire';
const MIN_JWT_SECRET_LENGTH = 32;

function assertUsableJwtSecret(secret: string) {
  const problem =
    secret === PLACEHOLDER_JWT_SECRET
      ? "JWT_SECRET est encore la valeur d'exemple, qui est publique."
      : secret.trim().length < MIN_JWT_SECRET_LENGTH
        ? `JWT_SECRET est trop court (${secret.trim().length} caractères, minimum ${MIN_JWT_SECRET_LENGTH}).`
        : null;
  if (!problem) return;

  throw new Error(
    `${problem}\n\n` +
      `N'importe qui connaissant cette valeur peut se connecter en tant que gérant sans mot de passe.\n` +
      `Générez-en une nouvelle et remplacez JWT_SECRET dans backend/.env :\n\n` +
      `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"\n\n` +
      `Tout le monde devra se reconnecter après le changement.`,
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  assertUsableJwtSecret(config.getOrThrow<string>('JWT_SECRET'));

  // Photos, supplier/customer logos and achats attachments (PDF/Word/image)
  // travel as base64 data-URIs in the JSON body (see Item.photoUrl's doc
  // comment) — Express's default 100kb limit would reject anything but a
  // tiny image, so it's raised here rather than introducing separate
  // multipart/object-storage infrastructure this deployment doesn't have.
  app.use(json({ limit: '15mb' }));
  app.use(urlencoded({ extended: true, limit: '15mb' }));

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
