import { HttpException, HttpStatus, Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { ConfigService } from "./modules/config/config.service";

@Injectable()
export class AppMiddleware implements NestMiddleware {

  constructor(private readonly configService: ConfigService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const config = this.configService.getConfig();
    const username = config.apiCredentials?.user;
    const password = config.apiCredentials?.pass;

    if ((!username || !password) || (username && password && req.headers.authorization === "Basic " + Buffer.from(username + ":" + password).toString("base64")) || req.url === "/" || req.url === "/api#") {
      next();
    } else {
      throw new HttpException("Unauthorized", HttpStatus.UNAUTHORIZED);
    }
  }
}