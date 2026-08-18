import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import basicAuth from "express-basic-auth";
import { AppModule } from "./app.module";
import { ConfigService } from "./modules/config/config.service";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService).getConfig();

  const user = config?.apiCredentials?.user;
  const pass = config?.apiCredentials?.pass;

  if (!user || !pass) {
    console.warn("No configuration found for API Username or Password! API is unsecured!");
  } else {
    app.use(["/api", "/public"], basicAuth({
      challenge: true,
      users: {
        [user]: pass,
      },
    }));
  }

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Mercari Watches")
    .setDescription("Mercari Watches API")
    .setVersion("1.0.3")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api", app, document, {
    customJs: "./public/swagger-static.js",
    customJsStr: `const vapidPublicKey = "${config.browserNotificationConfig?.vapidKeys?.publicKey}";`
  });

  await app.listen(3080);

}

bootstrap();