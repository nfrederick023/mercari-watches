import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { EmbedBuilder, WebhookClient, WebhookMessageCreateOptions } from "discord.js";
import nodemailer, { Transporter } from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import webPush, { SendResult } from "web-push";
import { Config } from "../config/config.interfaces";
import { ConfigService } from "../config/config.service";
import { WatchMatch } from "../mercari/mercari.interfaces";
import { Watch } from "../watch/watch.interfaces";
import { NotificationService } from "./notification.service";

jest.mock("discord.js", () => ({
  ...jest.requireActual("discord.js") as object,
  WebhookClient: jest.fn(),
}));

const defaultConfig: Config = {
  emailNotificationsEnabled: false,
  browserNotificationsEnabled: false,
  discordNotificationsEnabled: false,
  verboseLogging: false,
  requestFrequencyMS: 0,
  requestDelayMS: 0,
  requestPages: 0,
  clearRequestsLimit: 0,
  maxLinksPerEmail: 10
}

const emailConfig = {
  emailNotificationConfig: {
    host: "test",
    port: 465,
    secure: true,
    mailFrom: "test@test.com",
    auth: {
      user: "user",
      pass: "pass"
    }
  }
}

const browserConfig = {
  browserNotificationConfig: {
    mailTo: "test@test.com",
    vapidKeys: {
      publicKey: "public",
      privateKey: "private"
    }
  }
}

const defaultWatch: Watch = { email: "test@example.com", keywords: ["kw"], subscription: {} as webPush.PushSubscription, webhookUrl: "url" };
const defaultMatch = { id: "m", name: "kw", created: 60, keyword: "kw" };
const defaultMatches: WatchMatch[] = [defaultMatch];

describe("NotificationService", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("should successfully send an email notification", () => {
    const config: Config = {
      ...defaultConfig,
      ...emailConfig,
      emailNotificationsEnabled: true
    }

    const configService = new ConfigService();
    const sendMailMock = jest.fn((o: unknown, fn: (e: unknown) => void) => { fn(undefined); });
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    jest.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: sendMailMock } as unknown as Transporter<SMTPTransport.SentMessageInfo>);

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMailMock).toBeCalledTimes(1);

  })

  it("should fail to send an email notification", () => {
    const config: Config = {
      ...defaultConfig,
      ...emailConfig,
      emailNotificationsEnabled: true
    }

    const configService = new ConfigService();
    const sendMailMock = jest.fn((o: unknown, fn: (e: unknown) => void) => { fn(new Error); });
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    jest.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: sendMailMock } as unknown as Transporter<SMTPTransport.SentMessageInfo>);

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMailMock).toBeCalledTimes(1);

  })

  it("should not send a email notifications when there is no configuration", () => {
    const config: Config = {
      ...defaultConfig,
      emailNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMailMock = jest.fn((o: unknown, fn: (e: unknown) => void) => { fn(undefined); });
    jest.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: sendMailMock } as unknown as Transporter<SMTPTransport.SentMessageInfo>);

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMailMock).toBeCalledTimes(0);
  })

  it("should successfully send a browser notification", () => {
    const config: Config = {
      ...defaultConfig,
      ...browserConfig,
      browserNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    jest.spyOn(webPush, "setVapidDetails").mockImplementation(() => { });
    const webPushSpy = jest.spyOn(webPush, "sendNotification").mockImplementation((() => { }) as unknown as () => Promise<SendResult>);

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(webPushSpy).toBeCalledTimes(1);
  })

  it("should fail to send an browser notification", () => {
    const config: Config = {
      ...defaultConfig,
      ...browserConfig,
      browserNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    jest.spyOn(webPush, "setVapidDetails").mockImplementation(() => { });
    const webPushSpy = jest.spyOn(webPush, "sendNotification").mockImplementation(() => { throw new Error });

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(webPushSpy).toBeCalledTimes(1);
  })

  it("should not send a browser notifications when there is no configuration", () => {
    const config: Config = {
      ...defaultConfig,
      browserNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const webPushSpy = jest.spyOn(webPush, "sendNotification").mockImplementation((() => { }) as unknown as () => Promise<SendResult>);

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(webPushSpy).toBeCalledTimes(0);
  })

  it("should successfully send a discord notification", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn();
    const destroyMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: destroyMock
    }));

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMock).toBeCalledTimes(1);
    expect(destroyMock).toBeCalledTimes(1);

  })

  it("should fail to send a discord notification", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn(() => { throw new Error });
    const destroyMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: destroyMock
    }));

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMock).toBeCalledTimes(1);
    expect(destroyMock).toBeCalledTimes(0);
  })

  it("should not send a discord notification  when there is no configuration", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn(() => { throw new Error });
    const destroyMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: destroyMock
    }));

    const watch: Watch = { ...defaultWatch, webhookUrl: null };
    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(watch, defaultMatches);

    expect(sendMock).toBeCalledTimes(0);
    expect(destroyMock).toBeCalledTimes(0);
  })

  it("should not send any notifications when they're disabled", () => {
    const config: Config = {
      ...defaultConfig,
      ...emailConfig,
      ...browserConfig
    }

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);

    //email
    const sendMailMock = jest.fn((o: unknown, fn: (e: unknown) => void) => { fn(undefined); });
    jest.spyOn(nodemailer, "createTransport").mockReturnValue({ sendMail: sendMailMock } as unknown as Transporter<SMTPTransport.SentMessageInfo>);

    // browser
    const webPushSpy = jest.spyOn(webPush, "sendNotification").mockImplementation((() => { }) as unknown as () => Promise<SendResult>);

    //discord
    const sendMock = jest.fn(() => { throw new Error });
    const destroyMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: destroyMock
    }));

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, defaultMatches);

    expect(sendMailMock).toBeCalledTimes(0);
    expect(webPushSpy).toBeCalledTimes(0);
    expect(sendMock).toBeCalledTimes(0);
    expect(destroyMock).toBeCalledTimes(0);
  })

  it("should limit the number of links in a notification", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true,
      maxLinksPerEmail: 2
    };

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: () => { }
    }));

    const matches: WatchMatch[] = [defaultMatch, defaultMatch, defaultMatch];

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, matches);

    const args = sendMock.mock.calls[0][0] as WebhookMessageCreateOptions;

    console.log((args.embeds?.[0] as EmbedBuilder).data.description?.split("\n"))
    expect((args.embeds?.[0] as EmbedBuilder).data.description?.split("\n").length).toBe(9);
    expect((args.embeds?.[0] as EmbedBuilder).data.description?.includes("shops/product")).toBeFalsy();

  })

  it("should use Mercari Shops link in a notification", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true
    };

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: () => { }
    }));

    const matches: WatchMatch[] = [{ id: "1", name: "kw", created: 60, keyword: "kw" }];

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, matches);

    const args = sendMock.mock.calls[0][0] as WebhookMessageCreateOptions;

    expect((args.embeds?.[0] as EmbedBuilder).data.description?.includes("shops/product")).toBeTruthy();
  })

  it("should limit the discord description text lenth", () => {
    const config: Config = {
      ...defaultConfig,
      discordNotificationsEnabled: true,
      maxLinksPerEmail: 100
    };

    const configService = new ConfigService();
    jest.spyOn(configService, "getConfig").mockReturnValue(config);
    const sendMock = jest.fn();
    (WebhookClient as unknown as jest.Mock).mockImplementation(() => ({
      send: sendMock,
      destroy: () => { }
    }));

    const match = { id: "m", name: "thisIsaLongKeyWordToFillSpace", created: 60, keyword: "kw" };
    const matches: WatchMatch[] = [];

    // adjust as needed
    for (let i = 0; i < 100; i++) {
      matches.push(match);
    }

    const notificationService = new NotificationService(configService);
    notificationService.sendNotifications(defaultWatch, matches);

    const args = sendMock.mock.calls[0][0] as WebhookMessageCreateOptions;

    console.log((args.embeds?.[0] as EmbedBuilder).data.description);
    expect((args.embeds?.[0] as EmbedBuilder).data.description?.length).toBeLessThan(4096);
    expect((args.embeds?.[0] as EmbedBuilder).data.description?.includes("...and")).toBeTruthy();
  })

});