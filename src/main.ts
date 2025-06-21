/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Añadir esta línea para configurar el prefijo global
  app.setGlobalPrefix('api');

  // Configuración para preservar el cuerpo raw para las solicitudes de webhook
  app.use(
    bodyParser.json({
      verify: (req: any, res, buf) => {
        if (req.originalUrl === '/api/payments/webhook') {
          req.rawBody = buf;
        }
        return true;
      },
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  await app.listen(3000);
}
bootstrap();
