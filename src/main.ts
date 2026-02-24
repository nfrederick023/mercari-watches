import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as basicAuth from 'express-basic-auth';
import { readConfig } from './util/read-config';
import { GlobalService } from './global.service';
import { AppService } from './app.service';

async function bootstrap() {
  GlobalService.config = readConfig();
  const config = GlobalService.config;
  const app = await NestFactory.create(AppModule);

  if (config) {
    const user = config?.apiCredentials?.user;
    const pass = config?.apiCredentials?.pass;

    if (!user || !pass) {
      console.warn("No configuration found for API Username or Password! API is unsecured!");
    } else {
      app.use(['/api', '/public'], basicAuth({
        challenge: true,
        users: {
          [user]: pass,
        },
      }));
    }
  } else {
    GlobalService.config = {};
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mercari Watches')
    .setDescription('Mercari Watches API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document, {
    customJs: './public/swagger-static.js',
    customJsStr: `const vapidPublicKey = "${config?.browserNotificationConfig?.vapidKeys?.publicKey}";`
  });

  // if verbose logging is disabled, hide all console logs
  if (config?.verboseLogging !== undefined && !config?.verboseLogging) {
    console.log = function () { };
  }

  // configuration defaults 
  if (GlobalService.config) {
    if (config?.requestFrequencyMS === undefined) {
      GlobalService.config.requestFrequencyMS = 90000;
      console.warn('Configuration option "requestFrequencyMS" was unspecified. Proceeding with application default.')
    } else if (config?.requestFrequencyMS < 30000) {
      GlobalService.config.requestFrequencyMS = 90000;
      console.warn('Configuration option "requestFrequencyMS" was less than 30000ms. Proceeding with application default of 90000ms to avoid rate limiting.')
    }

    if (config?.requestDelayMS === undefined) {
      GlobalService.config.requestDelayMS = 1000;
      console.warn('Configuration option "requestDelayMS" was unspecified. Proceeding with application default.')
    }

    if (config?.requestPages === undefined) {
      GlobalService.config.requestPages = 3;
      console.warn('Configuration option "requestPages" was unspecified. Proceeding with application default.')
    }

    if (config?.clearRequestsLimit === undefined) {
      GlobalService.config.clearRequestsLimit = 25;
      console.warn('Configuration option "clearRequestsLimit" was unspecified. Proceeding with application default.')
    }

    if (config?.maxLinksPerEmail === undefined) {
      GlobalService.config.maxLinksPerEmail = 30;
      console.warn('Configuration option "maxLinksPerEmail" was unspecified. Proceeding with application default.')
    }

  }

  await app.get(AppService).init();   
  await app.listen(3080);

}
bootstrap();
