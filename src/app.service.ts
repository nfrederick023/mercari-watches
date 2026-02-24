import { Injectable } from '@nestjs/common';
import * as fs from 'node:fs';
import * as nodemailer from 'nodemailer';
import { Watch } from './app.interfaces';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Config } from './util/read-config';
import { SimpleMercariItem, WatchMatch } from './util/mercari-service/mercari.interfaces';
import * as webPush from 'web-push';
import { GlobalService } from './global.service';
import { MercariService } from './util/mercari-service/mercari.service';

@Injectable()
export class AppService {
  private readonly watchesDirectory = './data/watches.json';
  private seenIDs: Set<string> = new Set<string>();
  private count = 0;
  private transporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private config?: Config;
  private desktopNotificationsEnabled = false;
  private running = false;
  private keywords: string[] = [];

  constructor(private readonly mercariService: MercariService) {}

  async init() {
    this.config = GlobalService.config;

    if (this.config) {
      const webPushMailTo = this.config.browserNotificationConfig?.mailTo;
      const webPushPublicKey = this.config.browserNotificationConfig?.vapidKeys?.publicKey;
      const webPushPrivateKey = this.config.browserNotificationConfig?.vapidKeys?.privateKey;

      if (webPushMailTo && webPushPublicKey && webPushPrivateKey) {
        webPush.setVapidDetails(
          'mailto:' + webPushMailTo,
          webPushPublicKey,
          webPushPrivateKey,
        );

        this.desktopNotificationsEnabled = true;
      } else {
        console.warn("No configuration found for Browser notifications. Browser notifications are disabled.")
      }

      const host = this.config.emailNotificationConfig?.host;
      const port = this.config.emailNotificationConfig?.port;
      const secure = this.config.emailNotificationConfig?.secure;
      const user = this.config.emailNotificationConfig?.auth?.user;
      const pass = this.config.emailNotificationConfig?.auth?.pass;
      const fromEmail = this.config.emailNotificationConfig?.mailFrom;

      if (host && port && secure !== undefined && user && pass && fromEmail) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass
          }
        });
      } else {
        console.warn("No configuration found for email notifications. Email notifications are disabled.")
      }

      this.triggerWatchService();
    }
  }

  /**
   * API Functions
   */

  getWatches(): Watch[] {
    return JSON.parse(
      fs.readFileSync(this.watchesDirectory, 'utf8'),
    ) as Watch[];
  }

  createWatch(email: string): void {
    const watches = this.getWatches();

    const watch: Watch = {
      email,
      keywords: [],
      subscription: null
    };

    watches.push(watch);
    this.saveWatches(watches);
  }

  subscribe(emailOfWatch: string, subscription: webPush.PushSubscription) {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(
      (watch) => watch.email === emailOfWatch,
    );
    watches[watchIndex].subscription = subscription;
    this.saveWatches(watches);
  }

  unsubscribe(emailOfWatch: string) {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(
      (watch) => watch.email === emailOfWatch,
    );
    watches[watchIndex].subscription = null;
    this.saveWatches(watches);
  }

  removeWatch(emailOfWatch: string): void {
    const watches = this.getWatches();

    const newWatches = watches.filter((watch) => {
      return watch.email !== emailOfWatch;
    });

    this.saveWatches(newWatches);
  }

  addKeywordToWatch(emailOfWatch: string, keyword: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(
      (watch) => watch.email === emailOfWatch,
    );
    watches[watchIndex].keywords.push(keyword);
    this.saveWatches(watches);
  }

  removeKeywordFromWatch(emailOfWatch: string, keywordToRemove: string): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(
      (watch) => watch.email === emailOfWatch,
    );
    watches[watchIndex].keywords = watches[watchIndex].keywords.filter(
      (keyword) => keyword !== keywordToRemove,
    );
    this.saveWatches(watches);
  }

  setKeywordsOfWatch(emailOfWatch: string, keywords: string[]): void {
    const watches = this.getWatches();
    const watchIndex = watches.findIndex(
      (watch) => watch.email === emailOfWatch,
    );
    watches[watchIndex].keywords = keywords;
    this.saveWatches(watches);
  }

  resetWatches(): void {
    this.setBlankWatches();
  }

  /**
   *  Helper Functions
   */

  saveWatches(watches: Watch[]): void {
    fs.writeFileSync(this.watchesDirectory, JSON.stringify(watches));
  }

  createDataDirectory(): void {
    fs.mkdirSync('./data');
  }

  doesWatchesExist(): boolean {
    return fs.existsSync(this.watchesDirectory);
  }

  doesDataExist(): boolean {
    return fs.existsSync('./data');
  }

  setBlankWatches(): void {
    this.saveWatches([]);
  }

  createWatchesIfNotExist(): void {
    if (!this.doesDataExist()) {
      this.createDataDirectory();
    }

    if (!this.doesWatchesExist()) {
      this.setBlankWatches();
    }
  }

  sendNotifications(watch: Watch, matches: WatchMatch[]): void {
    let text = 'One or more items were found that matched your keywords! \n';

    // check if the item is from Mercari or MercariShops
    for (let i = 0; i < matches.length; i++) {
      if (i >= (this.config?.maxLinksPerEmail as number)) {
        break;
      }

      const match = matches[i];
      let link;

      if (match.id[0] === 'm') {
        link = `https://jp.mercari.com/en/item/${match.id}`;
      } else {
        link = `https://jp.mercari.com/en/shops/product/${match.id}`;
      }

      text += `\n\nItem Name: ${match.name} \nItem Link: ${link}`
    }

    if (watch.subscription && this.desktopNotificationsEnabled) {
      const payload = JSON.stringify({
        title: 'Mercari Watches',
        body: 'New Items!',
      });

      try {
        webPush.sendNotification(watch.subscription, payload);
        console.log('Browser notification sent successfully to ' + watch.email + ' for ' + matches.length + ' items!');
      } catch (e) {
        console.warn("Browser notification failed: " + e);
      }
    }

    if (this.transporter) {
      const mailOptions = {
        from: this.config?.emailNotificationConfig?.mailFrom,
        to: watch.email,
        subject: 'Mercari Watches: New Items are Avaliable!',
        text,
      };

      this.transporter.sendMail(mailOptions, function (e) {
        if (e) {
          console.warn("Email notification failed: " + e);
        } else {
          console.log('Email notification sent successfully to ' + watch.email + ' for ' + matches.length + ' items!');
        }
      });
    }
  }

  resetSeenIDs(): void {
    this.seenIDs = new Set<string>();
  };

  async triggerWatchService(): Promise<void> {
    this.createWatchesIfNotExist();

    const frequency = this.config?.requestFrequencyMS;

    const iterate = async () => {
      this.count++;

      if (this.running) {
        console.log("Skipping Iteration: " + this.count + " - Prior search in progess.");
        this.count++;
        return; 
      }
      
      this.running = true;
      const startTime = Date.now();

      try {
        console.log("Search Iteration: " + this.count);
        const watches = this.getWatches();

        if(watches.length === 0){
          console.log("No watches found. No search will be conducted.");
        }

        const keywords = watches.map(watch => watch.keywords).flat();

        // if the number of watches changes, reset the seenIDs to refresh the search
        if(this.seenIDs.size !== 0 && this.keywords.toString() !== keywords.toString()){
          console.log("Watch change detected. Searches will be refreshed.");
          this.resetSeenIDs();
        }

        this.keywords = keywords;

        // periodically reset the seenIDs every `clearRequestsLimit` iterations to keep ID list from growing too large 
        if (this.config?.clearRequestsLimit && this.count % this.config?.clearRequestsLimit === 0) {
          console.log("Request limit hit. Searches will be refreshed.");
          this.resetSeenIDs();
        }

        const iterationSeen = new Set<string>();
        const watchMatches: WatchMatch[] = [];

        if(keywords.length === 0){
          console.log("No keywords  defined. No search will be conducted.");
        }

        for (const keyword of new Set(keywords)) {
          const listings = await this.mercariService.getLatestListings(keyword);

          // listings is sorted by created newest -> oldest
          const newestSeenListing = listings.find(listing => this.seenIDs.has(listing.id));

          // if there were no listings found, ignore
          if (listings.length === 0) {
            continue;
          }

          // find new items relative to the seenIDs and their created dates
          const newListings = listings.filter((item) => !this.seenIDs.has(item.id) && item.created > (newestSeenListing?.created ?? 0));

          // notify only if we have previously seen state (not on start-up or search refresh) 
          // and when at least one new listing was found
          if (this.seenIDs.size && newListings.length > 0) {
            watchMatches.push(...newListings.map(listing => {return {...listing, keyword}}));
          }

          // add all listing ids to iterationSeen
          listings.forEach((item) => iterationSeen.add(item.id));
        }

        // send notifications for any matches
        if (watchMatches.length) {
          for(const watch of watches){
            const matchesToSend: WatchMatch[] = watchMatches.filter(match => watch.keywords.includes(match.keyword))
            if(matchesToSend.length){
              // console.log("Sending email to " + watch.email + " for " + matchesToSend.map(match => match.id).toString() + " for keywords " + matchesToSend.map(match => match.keyword).toString());
              this.sendNotifications(watch, matchesToSend);
            }
          }
        }

        // add all new IDs from this iteration to seenIDs
        iterationSeen.forEach(seen => this.seenIDs.add(seen));

      } catch (err) {
        console.warn("Error in Watch Service: ", err);
      } finally {
        console.log("Executed in " + (Date.now() - startTime) + "ms\n");
        this.running = false;
      }
    };

    setTimeout(iterate, 1000); 
    setInterval(iterate, frequency);
  }
}