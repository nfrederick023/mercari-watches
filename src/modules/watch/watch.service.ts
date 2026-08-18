import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import webPush from "web-push";
import { Watch } from "./watch.interfaces";

const watchesDirectory = "./data/watches.json";

@Injectable()
export class WatchService {

  public createWatch(email: string): void {
    const watches = this.getWatches();
    const watch: Watch = {
      email,
      keywords: [],
      subscription: null,
      webhookUrl: null
    };

    watches.push(watch);
    this.updateWatches(watches);
  }

  public getWatches(): Watch[] {
    this.initDataDirIfNotExist();

    if (!fs.existsSync(watchesDirectory)) {
      this.updateWatches([]);
      return [];
    } else {
      return JSON.parse(fs.readFileSync(watchesDirectory, "utf8")) as Watch[];
    }
  }

  public subscribeToWatch(emailOfWatch: string, subscription: webPush.PushSubscription) {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].subscription = subscription;
    this.updateWatches(watches);
  }

  public unsubscribeFromWatch(emailOfWatch: string) {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].subscription = null;
    this.updateWatches(watches);
  }

  public removeWatch(emailOfWatch: string): void {
    const watches = this.getWatches();
    const newWatches = watches.filter(watch => watch.email !== emailOfWatch);
    this.updateWatches(newWatches);
  }

  public addKeywordToWatch(emailOfWatch: string, keyword: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].keywords.push(keyword);
    this.updateWatches(watches);
  }

  public removeKeywordFromWatch(emailOfWatch: string, keywordToRemove: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].keywords = watches[watchIndex].keywords.filter(keyword => keyword !== keywordToRemove,);
    this.updateWatches(watches);
  }

  public addWebhookToWatch(emailOfWatch: string, webhook: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].webhookUrl = webhook;
    this.updateWatches(watches);
  }

  public removeWebhookFromWatch(emailOfWatch: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].webhookUrl = null;
    this.updateWatches(watches);
  }

  public setKeywordsOfWatch(emailOfWatch: string, keywords: string[]): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(watch => watch.email === emailOfWatch);
    watches[watchIndex].keywords = keywords;
    this.updateWatches(watches);
  }

  public resetWatches(): void {
    this.updateWatches([]);
  }

  private initDataDirIfNotExist(): void {
    if (!fs.existsSync("./data")) {
      fs.mkdirSync("./data");
    }
  }

  private updateWatches(watches: Watch[]): void {
    this.initDataDirIfNotExist();
    fs.writeFileSync(watchesDirectory, JSON.stringify(watches));
  }
}

