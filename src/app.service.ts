import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import getLatestListings from './util/mercari-service/mercari.service';
import * as nodemailer from 'nodemailer';
import puppeteer from 'puppeteer';
import { Watch } from './app.interfaces';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Config, readConfig } from './util/read-config';
import { SimpleMercariItem } from './util/mercari-service/mercari.interfaces';
import * as webPush from 'web-push';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly watchesDirectory = '/data/mercariwatch/watches.json';
  private seenIDs: string[] = [];
  private count = 0;
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private config: Config;

  async onModuleInit() {
    this.config = readConfig();
    if (this.config) {
      webPush.setVapidDetails(
        'mailto:' + this.config.fromEmail,
        this.config.vapidKeys.publicKey,
        this.config.vapidKeys.privateKey,
      );

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth
      });

      this.triggerWatchService();
    } else {
      throw (new Error("Failed to retrieve mail config!"))
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

  doesWatchesExist(): boolean {
    return fs.existsSync(this.watchesDirectory);
  }

  setBlankWatches(): void {
    this.saveWatches([]);
  }

  createWatchesIfNotExist(): void {
    this.seenIDs = [];

    if (!this.doesWatchesExist()) {
      this.setBlankWatches();
    }
  }

  sendNotifications(watch: Watch, matches: SimpleMercariItem[]): void {
    let text = 'One or more items were found that matched your keywords! \n';

    // check if the item is from Mercari or MercariShops
    matches.forEach(async (match) => {
      let link;

      if (match.id[0] === 'm') {
        link = `https://jp.mercari.com/en/item/${match.id}`;
      } else {
        link = `https://jp.mercari.com/en/shops/product/${match.id}`;
      }

      text += `\n\nItem Name: ${match.name} \nItem Link: ${link}`

      const payload = JSON.stringify({
        title: 'Mercari Watches',
        body: 'New Items!',
        url: link
      });
      if (watch.subscription) {
        await webPush.sendNotification(watch.subscription, payload);
      }
    });

    const mailOptions = {
      from: this.config.fromEmail,
      to: watch.email,
      subject: 'Mercari Watches: New Items are Avaliable!',
      text,
    };

    this.transporter.sendMail(mailOptions, function (error) {
      if (error) {
        console.warn(error);
      } else {
        console.log('Email Sent for ' + matches.length + ' items!');
      }
    });
  }

  async triggerWatchService(): Promise<void> {
    const delayBetweenUpdatesMS = 90000; // every 90 seconds
    this.createWatchesIfNotExist();
    const newSeenIDs = [];
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

    while (true) {
      console.log(this.count);
      try {
        const watches = this.getWatches();
        let token: string | undefined;
        this.count++;

        try {

          // we need to retrieve the mercari dpop token to utilize their search API
          // there's a way to do it normally, but idk how so instead we use puppeteer hack
          // get the token through normal user flow by pulling up the search results page (any keyword will work)
          const browser = await puppeteer.launch({ args, userDataDir });

          // help function to close all the pages and then the browser
          const closePuppeteer = async () => {
            const pages = await browser.pages();
            for (let i = 0; i < pages.length; i++) {
              await pages[i].close();
            }

            await browser.close();
            fs.rmSync(userDataDir, { recursive: true, force: true });
          }

          try {
            const [page] = await browser.pages();
            await page.goto(
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
            console.warn('A Mysterious Error Occured!\n' + e);
          }

        } catch (e) {
          console.warn('Browser Failed to Launch!\n' + e);
        }

        // if we got the token now we can make the actual search requests
        if (token) {
          // got through every watch, and each one of its search queries
          await Promise.all(
            watches.map(async (watch) => {
              const watchMatches: SimpleMercariItem[] = [];
              await Promise.all(
                watch.keywords.map(async (keyword) => {
                  const listings = await getLatestListings(keyword, token);
                  // remove any listsings we already know about 
                  const newListings = listings.filter(
                    (item) => !this.seenIDs.includes(item.id),
                  );

                  // don't add as a match before we've caputed the seen ids and/or for newly added search terms
                  if (
                    this.seenIDs.length &&
                    listings.length !== newListings.length
                  ) {
                    watchMatches.push(...newListings);
                  }

                  newSeenIDs.push(...listings.map((item) => item.id));
                }),
              );

              if (watchMatches.length) {
                this.sendNotifications(watch, watchMatches);
              }
            }),
          );
          this.seenIDs = newSeenIDs;
        } else {
          console.warn("No Token was Found!");
        }
      } catch (e) {
        console.warn('Error in Watch Service: ' + e);
      }

      await new Promise<void>((res) => {
        setTimeout(() => {
          res();
        }, delayBetweenUpdatesMS);
      });
    }
  }
}
