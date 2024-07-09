import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppService } from './app.service';
import { GlobalService } from './global.service';

@Injectable()
export class AppMiddleware implements NestMiddleware {
  constructor(private readonly service: AppService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const config = GlobalService.config;

    const username = config?.apiCredentails?.user;
    const password = config?.apiCredentails?.pass;

    if ((!username || !password) || (username && password && req.headers.authorization === "Basic " + Buffer.from(username + ":" + password).toString('base64')) || req.url === "/" || req.url === "/api#") {
      this.service.createWatchesIfNotExist();
      next();
    } else {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }
}