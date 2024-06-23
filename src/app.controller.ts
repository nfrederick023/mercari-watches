import { Controller, Delete, Get, Post, Put, Query, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { Watch } from './app.interfaces';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get("")
  redirectToAPI(@Res() res): Watch[] {
    return res.redirect('/api#');
  }

  @Get("getWatches")
  getWatches(): Watch[] {
    return this.appService.getWatches();
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
