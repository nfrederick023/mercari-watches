import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppService } from './app.service';

@Injectable()
export class AppMiddleware implements NestMiddleware {
  constructor(private readonly service: AppService) { }

  use(req: Request, res: Response, next: NextFunction) {
    this.service.createWatchesIfNotExist();
    next();
  }
}
