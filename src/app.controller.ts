import { Controller, Get, Res } from "@nestjs/common";
import { ApiExcludeEndpoint } from "@nestjs/swagger";
import { Response } from "express";

@Controller()
export class AppController {

  // redirects any requests to GET "/" to the API Swagger
  @Get("")
  @ApiExcludeEndpoint()
  redirectToSwagger(@Res() res: Response): void {
    return res.redirect("/api#");
  }

}
