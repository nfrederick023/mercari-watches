import { Injectable } from "@nestjs/common";
import { EmbedBuilder, WebhookClient } from "discord.js";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import webPush from "web-push";
import { ConfigService } from "../config/config.service";
import { WatchMatch } from "../mercari/mercari.interfaces";
import { Watch } from "../watch/watch.interfaces";

@Injectable()
export class NotificationService {
  private readonly transporter?: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;
  private readonly isWebPushConfigured: boolean = false;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.getConfig();

    const webPushMailTo = config.browserNotificationConfig?.mailTo;
    const webPushPublicKey = config.browserNotificationConfig?.vapidKeys?.publicKey;
    const webPushPrivateKey = config.browserNotificationConfig?.vapidKeys?.privateKey;

    if (webPushMailTo && webPushPublicKey && webPushPrivateKey) {
      webPush.setVapidDetails(
        "mailto:" + webPushMailTo,
        webPushPublicKey,
        webPushPrivateKey,
      );
      this.isWebPushConfigured = true;
    } else {
      console.warn("No configuration found for browser notifications. Browser notifications are disabled.")
    }

    const host = config.emailNotificationConfig?.host;
    const port = config.emailNotificationConfig?.port;
    const secure = config.emailNotificationConfig?.secure;
    const user = config.emailNotificationConfig?.auth?.user;
    const pass = config.emailNotificationConfig?.auth?.pass;
    const fromEmail = config.emailNotificationConfig?.mailFrom;

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
  }

  public sendNotifications(watch: Watch, matches: WatchMatch[]): void {
    const config = this.configService.getConfig();

    const title = "Mercari Watches: New Items are Avaliable!";
    let text = "One or more items were found that matched your keywords!";
    let discordText = "";

    // check if the item is from Mercari or MercariShops
    for (let i = 0; i < matches.length; i++) {
      if (i >= (config.maxLinksPerEmail as number)) {
        text += "\n\n...and " + (matches.length - config.maxLinksPerEmail) + " more."
        break;
      }

      const match = matches[i];
      let link;

      if (match.id[0] === "m") {
        link = `https://jp.mercari.com/en/item/${match.id}`;
      } else {
        link = `https://jp.mercari.com/en/shops/product/${match.id}`;
      }

      // 4096 is the hard cap
      // https://docs.discord.com/developers/resources/message#embed-object-embed-structure
      const discordDescriptionMaxText = 4090;
      const newText = `\n\nItem Name: ${match.name} \nItem Link: ${link}`;

      // if the max text limit has been hit, set the discord text message
      if (!discordText && text.length + newText.length >= discordDescriptionMaxText) {
        discordText = text + "\n\n...and " + (matches.length - i) + " more."
      }

      text += newText;
    }

    // if the max text limit was never hit, set the discord text message
    if (!discordText) {
      discordText = text;
    }

    if (config.emailNotificationsEnabled && config.emailNotificationConfig && this.transporter) {
      const mailOptions = {
        from: config.emailNotificationConfig.mailFrom,
        to: watch.email,
        subject: title,
        text,
      };

      this.transporter.sendMail(mailOptions, (e) => {
        if (e) {
          console.warn("Email notification failed: " + e);
        } else {
          console.log("Email notification sent successfully to " + watch.email + " for " + matches.length + " items!");
        }
      });
    }

    if (config.browserNotificationsEnabled && this.isWebPushConfigured && watch.subscription) {
      const payload = JSON.stringify({
        title,
        body: "New Items!",
      });

      try {
        webPush.sendNotification(watch.subscription, payload);
        console.log("Browser notification sent successfully to " + watch.email + " for " + matches.length + " items!");
      } catch (e) {
        console.warn("Browser notification failed: " + e);
      }
    }

    if (config.discordNotificationsEnabled && watch.webhookUrl) {
      try {
        const embed = new EmbedBuilder().setTitle(title).setDescription(discordText).setColor(0xF1050F);
        const webhookClient = new WebhookClient({ url: watch.webhookUrl })
        webhookClient.send({
          username: "Mercari Watches",
          embeds: [embed]
        });
        webhookClient.destroy();
        console.log("Discord notification sent successfully to " + watch.email + " for " + matches.length + " items!");
      } catch (e) {
        console.warn("Discord notification failed: " + e);
      }
    }
  }

}