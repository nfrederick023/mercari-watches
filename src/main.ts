import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as basicAuth from 'express-basic-auth';
import { readConfig } from './util/read-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = readConfig();

  if (!config.apiUser || !config.apiPassword) {
    throw (new Error("Username and Password not configured!"))
  }

  app.use(['/api', '/public'], basicAuth({
    challenge: true,
    users: {
      [config.apiUser]: config.apiPassword,
    },
  }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mercari Watches')
    .setDescription('Mercari Watches API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customJs: './public/swagger-static.js',
    customJsStr: `const vapidPublicKey = "${config.vapidKeys.publicKey}";`
  });

  await app.listen(3080);
}
bootstrap();
