import { jest } from '@jest/globals';
import { AppService } from './app.service';
import { GlobalService } from './global.service';
import { MercariService } from './util/mercari-service/mercari.service';
import { SimpleMercariItem } from './util/mercari-service/mercari.interfaces';

jest.useFakeTimers();

const REQUEST_FREQ = 50;

const createListingsMocks = (ms: MercariService, listings: SimpleMercariItem[][] ) => {
  const msSpy = jest.spyOn(ms, 'getLatestListings');
  for (const listing of listings){
    msSpy.mockReturnValueOnce(new Promise(resolve =>  resolve(listing)));
  }
  return msSpy;
}

describe("AppService.triggerWatchService race condition", () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
  });

  beforeEach(() => {
    GlobalService.config = {
      requestFrequencyMS: REQUEST_FREQ,
    };
  });

  it("should send a notification", async () => {
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '2', name: 'kw', created: 10 }]
    ])

    svc.init();

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);
  })

  it("should throw an error in watch service", async () => {
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    jest.spyOn(ms, 'getLatestListings').mockImplementation(() => {throw new Error});

    svc.init();

    expect(sendSpy).toHaveBeenCalledTimes(0);
  })

  it("should reset seenIds periodically", async () => {
    if (GlobalService.config) {
      GlobalService.config.clearRequestsLimit = 3;
    }

    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '2', name: 'kw', created: 15 }],
      [{ id: '3', name: 'kw', created: 20 }],
      [{ id: '4', name: 'kw', created: 25 }],
    ])

    svc.init();

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
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      []
    ])

    svc.init();

    await Promise.resolve();
    expect(sendSpy).toHaveBeenCalledTimes(0);
  })

  it("should skip a notification because no watches", async () => {
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    const msSpy = createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '2', name: 'kw', created: 15 }],
      [{ id: '3', name: 'kw', created: 20 }],
      [{ id: '4', name: 'kw', created: 25 }],
    ])

    svc.init();

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(msSpy).toHaveBeenCalledTimes(2);
    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.spyOn(svc, 'getWatches').mockImplementation(() => []);

    jest.advanceTimersByTime(REQUEST_FREQ);
    expect(msSpy).toHaveBeenCalledTimes(2);

    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
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
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '2', name: 'kw', created: 15 }],
      // reset
      [{ id: '9', name: 'kw', created: 30 }, { id: '8', name: 'kw', created: 15 }, { id: '7', name: 'kw', created: 20 }],
      [{ id: '4', name: 'kw2', created: 5 }],
      [{ id: '9', name: 'kw', created: 30 }, { id: '8', name: 'kw', created: 15 }, { id: '7', name: 'kw', created: 20 }],
      [{ id: '4', name: 'kw2', created: 5 }, { id: '1', name: 'kw', created: 10 }],
    ])

    svc.init();

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(1);
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw', 'kw2'], subscription: null }]);

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
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw', 'kw1', 'kw2'], subscription: null }, { email: 'test1@example.com', keywords: ['kw', 'kw3'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '2', name: 'kw1', created: 10 }],
      [{ id: '3', name: 'kw2', created: 10 }],
      [{ id: '4', name: 'kw3', created: 10 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '6', name: 'kw', created: 15 }],
      [{ id: '2', name: 'kw1', created: 10 }, { id: '7', name: 'kw1', created: 15 }],
      [{ id: '3', name: 'kw2', created: 10 }, { id: '8', name: 'kw2', created: 5 }],
      [{ id: '4', name: 'kw3', created: 10 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '6', name: 'kw', created: 15 }],
      [{ id: '2', name: 'kw1', created: 10 }, { id: '7', name: 'kw1', created: 15 }, { id: '9', name: 'kw1', created: 15 }],
      [{ id: '3', name: 'kw2', created: 10 }, { id: '8', name: 'kw2', created: 5 }],
      [{ id: '4', name: 'kw3', created: 10 }],
    ])

    svc.init();

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
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }, { email: 'test1@example.com', keywords: ['kw2'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }],
      [{ id: '2', name: 'kw2', created: 10 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '3', name: 'kw', created: 15 }],
      [{ id: '2', name: 'kw2', created: 10 }, { id: '4', name: 'kw2', created: 15 }]
    ])

    svc.init();

    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);
  })

  it("should send notifications for multiple emails with the same keyword", async () => {
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }, { email: 'test1@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'a', created: 10 }],
      [{ id: '1', name: 'a', created: 10 }, { id: '2', name: 'c', created: 15 }]
    ])

    svc.init();

    await Promise.resolve();
    jest.advanceTimersByTime(REQUEST_FREQ);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(2);
  })

  it("should not send notifications for an old id that appear because new ids were delisted", async () => {
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    createListingsMocks(ms, [
      [{ id: '1', name: 'kw', created: 10 }, { id: '2', name: 'b', created: 5 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '3', name: 'c', created: 1 }],
      [{ id: '1', name: 'kw', created: 10 }, { id: '4', name: 'd', created: 15 }],
    ])

    svc.init();

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
    const ms = new MercariService();
    const svc = new AppService(ms);
    jest.spyOn(svc, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc, 'getWatches').mockImplementation(() => [{ email: 'test@example.com', keywords: ['kw'], subscription: null }]);
    const sendSpy = jest.spyOn(svc, 'sendNotifications').mockImplementation(() => {});
    const SHORT_DELAY = REQUEST_FREQ * 0.25;

    jest.spyOn(ms, 'getLatestListings')
    .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([{ id: '1', name: 'a', created: 0 }, { id: '2', name: 'b', created: 10 }]), REQUEST_FREQ + (SHORT_DELAY * 2))))
    .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([{ id: '1', name: 'a', created: 0 }, ]), SHORT_DELAY)));

    svc.init();

    jest.advanceTimersByTime(REQUEST_FREQ + SHORT_DELAY);
    await Promise.resolve();

    jest.advanceTimersByTime(SHORT_DELAY);
    await Promise.resolve();

    expect(sendSpy).toHaveBeenCalledTimes(0);
  });
});