import { Module } from "@nestjs/common";
import { MiddlewareConsumer, NestModule } from "@nestjs/common/interfaces";
import { ServeStaticModule } from "@nestjs/serve-static";
import path from "node:path";
import { AppController } from "./app.controller";
import { AppMiddleware } from "./app.middleware";
import { ConfigService } from "./modules/config/config.service";
import { MercariService } from "./modules/mercari/mercari.service";
import { NotificationService } from "./modules/notification/notification.service";
import { SearchService } from "./modules/search/search.service";
import { WatchController } from "./modules/watch/watch.controller";
import { WatchService } from "./modules/watch/watch.service";

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, "public"),
      serveRoot: "/public",
    })
  ],
  controllers: [AppController, WatchController],
  providers: [SearchService, MercariService, ConfigService, WatchService, NotificationService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppMiddleware)
      .forRoutes("");
  }
}