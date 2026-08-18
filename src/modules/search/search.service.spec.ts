import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { Config } from "../config/config.interfaces";
import { ConfigService } from "../config/config.service";
import { SimpleMercariItem } from "../mercari/mercari.interfaces";
import { MercariService } from "../mercari/mercari.service";
import { NotificationService } from "../notification/notification.service";
import { Watch } from "../watch/watch.interfaces";
import { WatchService } from "../watch/watch.service";
import { SearchService } from "./search.service";

jest.useFakeTimers();

const REQUEST_FREQ = 50;

const defaultConfig: Config = {
  emailNotificationsEnabled: false,
  browserNotificationsEnabled: false,
  discordNotificationsEnabled: false,
  verboseLogging: false,
  requestFrequencyMS: REQUEST_FREQ,
  requestDelayMS: 0,
  requestPages: 0,
  clearRequestsLimit: 0,
  maxLinksPerEmail: 0
}

const defaultWatches: Watch[] = [{ email: "test@example.com", keywords: ["kw"], subscription: null, webhookUrl: null }];

const createService = (config: Config = defaultConfig, watches: Watch[] = defaultWatches, listings: SimpleMercariItem[][]): [NotificationService, MercariService, WatchService, ConfigService] => {

  const configService = new ConfigService();
  jest.spyOn(configService, "getConfig").mockReturnValue(config)

  const watchService = new WatchService();
  jest.spyOn(watchService, "getWatches").mockReturnValue(watches)

  const mercariService = new MercariService(configService);
  const mercariServiceSpy = jest.spyOn(mercariService, "getLatestListings");
  listings.forEach(listing => mercariServiceSpy.mockReturnValueOnce(new Promise(resolve => resolve(listing))));

  const notificationService: NotificationService = new NotificationService(configService);
  new SearchService(mercariService, configService, watchService, notificationService);

  return [notificationService, mercariService, watchService, configService];
};

describe("AppService", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  it("should send a notification", async () => {
    const [ns] = createService(undefined, undefined, [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "2", name: "kw", created: 60 }]
    ]);

    const notificationServiceSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    expect(notificationServiceSpy).toHaveBeenCalledTimes(1);

  })

  it("should throw an error in watch service", async () => {
    const [ns, ms] = createService(undefined, undefined, [[{ id: "1", name: "kw", created: 10 }]]);

    const sendSpy = jest.spyOn(ns, "sendNotifications");
    jest.spyOn(ms, "getLatestListings").mockImplementation(() => { throw new Error });

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);

    expect(sendSpy).toHaveBeenCalledTimes(0);
  })

  it("should reset seenIds periodically", async () => {
    const config = {
      ...defaultConfig,
      clearRequestsLimit: 3
    }

    const [ns] = createService(config, undefined, [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "2", name: "kw", created: 15 }],
      [{ id: "3", name: "kw", created: 20 }],
      [{ id: "4", name: "kw", created: 25 }],
    ]);

    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    expect(sendSpy).toHaveBeenCalledTimes(2);
  })

  it("should skip when no listings are found", async () => {
    const [ns] = createService(undefined, undefined, []);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    expect(sendSpy).toHaveBeenCalledTimes(0);
  })

  it("should skip a notification because no watches", async () => {
    const [ns, ms, ws] = createService(undefined, undefined, [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "2", name: "kw", created: 15 }],
      [{ id: "3", name: "kw", created: 20 }],
      [{ id: "4", name: "kw", created: 25 }],
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    const msSpy = jest.spyOn(ms, "getLatestListings");

    expect(msSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.spyOn(ws, "getWatches").mockReturnValue([])

    jest.advanceTimersByTime(REQUEST_FREQ);
    expect(msSpy).toHaveBeenCalledTimes(2);

    jest.spyOn(ws, "getWatches").mockReturnValue(defaultWatches);
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    expect(msSpy).toHaveBeenCalledTimes(3);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    expect(msSpy).toHaveBeenCalledTimes(4);
    expect(sendSpy).toHaveBeenCalledTimes(2);

  })

  it("should send reset searches because keywords changed", async () => {
    const [ns, , ws] = createService(undefined, undefined, [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "2", name: "kw", created: 15 }],
      [{ id: "9", name: "kw", created: 30 }, { id: "8", name: "kw", created: 15 }, { id: "7", name: "kw", created: 20 }],
      [{ id: "4", name: "kw2", created: 5 }],
      [{ id: "9", name: "kw", created: 30 }, { id: "8", name: "kw", created: 15 }, { id: "7", name: "kw", created: 20 }],
      [{ id: "4", name: "kw2", created: 5 }, { id: "1", name: "kw", created: 10 }],
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.spyOn(ws, "getWatches").mockReturnValue([{ email: "test@example.com", keywords: ["kw", "kw2"], subscription: null, webhookUrl: null }]);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);

  })

  it("should send notifications for multiple emails with multiple different keywords", async () => {
    const [ns] = createService(undefined, [
      { email: "test@example.com", keywords: ["kw", "kw1", "kw2"], subscription: null, webhookUrl: null },
      { email: "test1@example.com", keywords: ["kw", "kw3"], subscription: null, webhookUrl: null }
    ], [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "2", name: "kw1", created: 10 }],
      [{ id: "3", name: "kw2", created: 10 }],
      [{ id: "4", name: "kw3", created: 10 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "6", name: "kw", created: 15 }],
      [{ id: "2", name: "kw1", created: 10 }, { id: "7", name: "kw1", created: 15 }],
      [{ id: "3", name: "kw2", created: 10 }, { id: "8", name: "kw2", created: 5 }],
      [{ id: "4", name: "kw3", created: 10 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "6", name: "kw", created: 15 }],
      [{ id: "2", name: "kw1", created: 10 }, { id: "7", name: "kw1", created: 15 }, { id: "9", name: "kw1", created: 15 }],
      [{ id: "3", name: "kw2", created: 10 }, { id: "8", name: "kw2", created: 5 }],
      [{ id: "4", name: "kw3", created: 10 }],
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(3);

  })

  it("should send notifications for multiple emails with different keywords", async () => {
    const [ns] = createService(undefined, [
      { email: "test@example.com", keywords: ["kw"], subscription: null, webhookUrl: null },
      { email: "test1@example.com", keywords: ["kw2"], subscription: null, webhookUrl: null }
    ], [
      [{ id: "1", name: "kw", created: 10 }],
      [{ id: "2", name: "kw2", created: 10 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "3", name: "kw", created: 15 }],
      [{ id: "2", name: "kw2", created: 10 }, { id: "4", name: "kw2", created: 15 }]
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);
  })

  it("should send notifications for multiple emails with the same keyword", async () => {

    const [ns] = createService(undefined, [
      { email: "test@example.com", keywords: ["kw"], subscription: null, webhookUrl: null },
      { email: "test1@example.com", keywords: ["kw"], subscription: null, webhookUrl: null }
    ], [
      [{ id: "1", name: "a", created: 10 }],
      [{ id: "1", name: "a", created: 10 }, { id: "2", name: "c", created: 15 }]
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);
  })

  it("should not send notifications for an old id that appear because new ids were delisted", async () => {

    const [ns] = createService(undefined, undefined, [
      [{ id: "1", name: "kw", created: 10 }, { id: "2", name: "b", created: 5 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "3", name: "c", created: 1 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "4", name: "d", created: 15 }],
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    await Promise.resolve();
    expect(sendSpy).toHaveBeenCalledTimes(0);

    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(0);
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);
  })

  it("should skip because prior search is in progress", async () => {
    const [ns, ms] = createService(undefined, undefined, [
      [{ id: "1", name: "kw", created: 10 }, { id: "2", name: "b", created: 5 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "3", name: "c", created: 1 }],
      [{ id: "1", name: "kw", created: 10 }, { id: "4", name: "d", created: 15 }],
    ]);
    const sendSpy = jest.spyOn(ns, "sendNotifications");

    const SHORT_DELAY = REQUEST_FREQ * 0.25;

    jest.spyOn(ms, "getLatestListings")
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([{ id: "1", name: "a", created: 0 }, { id: "2", name: "b", created: 10 }]), REQUEST_FREQ + (SHORT_DELAY * 2))))
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([{ id: "1", name: "a", created: 0 },]), SHORT_DELAY)));

    jest.advanceTimersByTime(REQUEST_FREQ + SHORT_DELAY);
    await Promise.resolve();

    jest.advanceTimersByTime(SHORT_DELAY);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(0);
  });
});