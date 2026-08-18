import { Body, Controller, Delete, Get, HttpException, HttpStatus, Post, Put, Query } from "@nestjs/common";
import webPush from "web-push";
import { Watch } from "./watch.interfaces";
import { WatchService } from "./watch.service";

@Controller()
export class WatchController {

    constructor(private readonly watchService: WatchService) { }

    @Get("getWatches")
    getWatches(): Watch[] {
        return this.watchService.getWatches();
    }

    @Post("createWatch")
    createWatch(@Query("email") email: string): void {
        return this.watchService.createWatch(email);
    }

    @Put("addKeywordToWatch")
    addKeywordToWatch(@Query("email") email: string, @Query("keyword") keyword: string): void {
        return this.watchService.addKeywordToWatch(email, keyword);
    }

    @Put("setKeywordsOfWatch")
    setKeywordsOfWatch(@Query("email") email: string, @Query("keywords") keywords: string[]): void {
        return this.watchService.setKeywordsOfWatch(email, typeof keywords === "string" ? [keywords] : keywords);
    }

    @Put("removeKeywordFromWatch")
    removeKeywordFromWatch(@Query("email") email: string, @Query("keyword") keyword: string): void {
        return this.watchService.removeKeywordFromWatch(email, keyword);
    }

    @Put("resetWatches")
    resetWatches(): void {
        return this.watchService.resetWatches();
    }

    @Put("addWebhookToWatch")
    addWebhookToWatch(@Query("email") email: string, @Query("webhook") webhook: string): void {
        return this.watchService.addWebhookToWatch(email, webhook);
    }

    @Put("removeWebhookFromWatch")
    removeWebhookFromWatch(@Query("email") email: string): void {
        return this.watchService.removeWebhookFromWatch(email);
    }

    @Put("subscribeToWatch")
    subscribeToWatch(@Query("email") email: string, @Body() subscription?: webPush.PushSubscription): void {
        if (subscription)
            return this.watchService.subscribeToWatch(email, subscription);
        throw new HttpException("Bad Request", HttpStatus.BAD_REQUEST);
    }

    @Put("unsubscribeFromWatch")
    unsubscribeFromWatch(@Query("email") email: string): void {
        return this.watchService.unsubscribeFromWatch(email);
    }

    @Delete("removeWatch")
    removeWatch(@Query("email") email: string): void {
        return this.watchService.removeWatch(email);
    }

}
