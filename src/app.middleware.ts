import { Injectable, NestMiddleware, OnModuleInit } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppService } from './app.service';
import { Config, readConfig } from './util/read-config';

@Injectable()
export class AppMiddleware implements NestMiddleware, OnModuleInit {
  constructor(private readonly service: AppService) { }
  public config: Config;

  onModuleInit() {
    this.config = readConfig();
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (req.headers.authorization === "Basic " + Buffer.from(this.config.apiUser + ":" + this.config.apiPassword).toString('base64') || req.url === "/" || req.url === "/api#") {
      this.service.createWatchesIfNotExist();
      next();
    } else {
      res.status(401);
      res.end();
    }
  }
}
