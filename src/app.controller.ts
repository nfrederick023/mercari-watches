import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Put, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Watch } from './app.interfaces';
import * as webPush from 'web-push';
import { Response } from 'express';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("")
  @ApiExcludeEndpoint()
  redirectToAPI(@Res() res: Response): void {
    return res.redirect('/api#');
  }

  @Get("getWatches")
  getWatches(): Watch[] {
    return this.appService.getWatches();
  }

  @Post("subscribe")
  subscribe(@Query('email') email: string, @Body() subscription?: webPush.PushSubscription): void {
    if (subscription)
      return this.appService.subscribe(email, subscription);
    throw new HttpException('Bad Request', HttpStatus.BAD_REQUEST);
  }

  @Put("unsubscribe")
  unsubscribe(@Query('email') email: string): void {
    return this.appService.unsubscribe(email);
  }

  @Post("createWatch")
  createWatch(@Query('email') email: string): void {
    return this.appService.createWatch(email);
  }

  @Delete("removeWatch")
  removeWatch(@Query('email') email: string): void {
    return this.appService.removeWatch(email);
  }

  @Put("addKeywordToWatch")
  addKeywordToWatch(@Query('email') email: string, @Query('keyword') keyword: string): void {
    return this.appService.addKeywordToWatch(email, keyword);
  }

  @Put("removeKeywordFromWatch")
  removeKeywordFromWatch(@Query('email') email: string, @Query('keyword') keyword: string): void {
    return this.appService.removeKeywordFromWatch(email, keyword);
  }

  @Put("setKeywordsOfWatch")
  setKeywordsOfWatch(@Query('email') email: string, @Query('keyword') keywords: string[] | string): void {
    return this.appService.setKeywordsOfWatch(email, typeof keywords === "string" ? [keywords] : keywords);
  }

  @Delete("resetWatches")
  resetWatches(): void {
    return this.appService.resetWatches();
  }
}
