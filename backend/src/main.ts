import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { getCorsOrigins } from './app/cors-origins';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: getCorsOrigins(),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(PORT);
  console.log(`🚀 Blue Horizon API running on http://localhost:${PORT}`);
}
void bootstrap();
