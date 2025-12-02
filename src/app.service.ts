import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import getLatestListings from './util/mercari-service/mercari.service';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import { Watch } from './app.interfaces';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Config } from './util/read-config';
import { SimpleMercariItem } from './util/mercari-service/mercari.interfaces';
import * as webPush from 'web-push';
import { GlobalService } from './global.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly watchesDirectory = './data/watches.json';
  private seenIDs: string[] = [];
  private count = 0;
  private transporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private config?: Config;
  private desktopNotificationsEnabled = false;

  async onModuleInit() {
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
    this.seenIDs = [];

    if (!this.doesDataExist()) {
      this.createDataDirectory();
    }

    if (!this.doesWatchesExist()) {
      this.setBlankWatches();
    }
  }

  sendNotifications(watch: Watch, matches: SimpleMercariItem[]): void {
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

  async triggerWatchService(): Promise<void> {
    this.createWatchesIfNotExist();
    let newSeenIDs: string[] = [];
    const userDataDir = "./dev/null";
    const args = [
      '--aggressive-cache-discard',
      '--disable-cache',
      '--disable-application-cache',
      '--disable-offline-load-stale-cache',
      '--disable-gpu-shader-disk-cache',
      '--media-cache-size=0',
      '--disk-cache-size=0',
      '--no-sandbox'
    ];

    setInterval(async () => {
      console.log("Search Iteration: " + this.count);
      try {
        const watches = this.getWatches();
        let token: string | undefined;
        this.count++;

        if (this.config?.clearRequestsLimit && this.count % this.config?.clearRequestsLimit === 0) {
          newSeenIDs = [];
          this.seenIDs = [];
        }

        try {

          // we need to retrieve the mercari dpop token to utilize their search API
          // there's a way to do it normally, but idk how so instead we use puppeteer hack
          // get the token through normal user flow by pulling up the search results page (any keyword will work)
          const browser = await puppeteer.launch({ args, userDataDir });

          // help function to close all the pages and then the browser
          const closePuppeteer = async () => {
            try{
              const pages = await browser.pages();
              for (let i = 0; i < pages.length; i++) {
                await pages[i].close();
              }

              await browser.close();
            } catch (e) {
              console.warn('Error closing Puppeteer browser: ' + e);
            }
            fs.rmSync(userDataDir, {recursive: true, force: true})
          }

          try {
            const [page] = await browser.pages();
            await page.goto(
              // any search term will work here, but it has to be a search of some kind
              'https://jp.mercari.com/en/search?keyword=けいおん'
            );

            await new Promise<void>((res) => {

              // if we don't get the token within 20 seconds, something is wrong 
              setTimeout(async () => {
                if (!page.isClosed()) {
                  await closePuppeteer();
                }

                res()
              }, 20000);

              // wait for all http requests, find the one that gets the search results, pull out the dpop token from the headers
              page.on('request', async (req) => {
                const url = req.url().includes('entities:search');
                const dpop = req.headers().dpop;

                if (url && dpop) {
                  token = dpop;
                  res()
                  await closePuppeteer();
                }
              });
            })
          } catch (e) {
            await closePuppeteer();
            console.warn('A Mysterious Error Occured! Search was rejected.\n' + e);
          }
        } catch (e) {
          console.warn('Chromium Browser Failed to Launch! Search was rejected.\n' + e);
        }

        // if we got the token now we can make the actual search requests
        if (token) {
          // go through every watch
          for (const watch of watches) {

            const watchMatches: SimpleMercariItem[] = [];

            // loop through each search term in that watch
            for (const keyword of watch.keywords) {

              const listings = await getLatestListings(keyword, token as unknown as string);

              // everything we've seen before for this search term
              const oldListings = listings.filter(
                (item) => this.seenIDs.includes(item.id),
              );

              // everything we haven't seen for this search term
              const newListings = listings.filter(
                (item) => !this.seenIDs.includes(item.id),
              );

              // prevents sending out notifications when the app starts (this.seenIDs.length) or brand new search terms (oldListings.length < listings.length)
              if (this.seenIDs.length && oldListings.length < listings.length) {
                watchMatches.push(...newListings);
              }

              newSeenIDs.push(...listings.map((item) => item.id));

            };

            // onces all of the matches have been compiled, send them out!
            if (watchMatches.length) {
              this.sendNotifications(watch, watchMatches);
            }
          }

          this.seenIDs = newSeenIDs;
        } else {
          console.warn("No Mercari Dpop Token was Retrieved! Unable to search for items.");
        }
      } catch (e) {
        console.warn('Error in Watch Service: ' + e);
      }

    }, this.config?.requestFrequencyMS);
  }
}
