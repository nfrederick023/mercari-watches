import { jest } from '@jest/globals';
import { AppService } from '../src/app.service';
import { GlobalService } from '../src/global.service';
import { MercariService } from './util/mercari-service/mercari.service';

jest.useFakeTimers();

describe('AppService.triggerWatchService race condition', () => {
  afterEach(() => {
    jest.clearAllTimers();
    jest.resetAllMocks();
    GlobalService.config = undefined;
  });

  test('overlapping interval runs can cause a notification to be sent on the very first logical run (reentrancy race)', async () => {
    // config: small frequency so intervals will overlap in the test
    GlobalService.config = {
      requestFrequencyMS: 50,
      requestPages: 1,
      requestDelayMS: 0,
      maxLinksPerEmail: 5,
    };

    const mercariService = new MercariService();
    const svc = new AppService(mercariService);

    svc.onModuleInit();

    // avoid fs and other startup behavior
    jest.spyOn(svc as any, 'createWatchesIfNotExist').mockImplementation(() => {});
    jest.spyOn(svc as any, 'getWatches').mockImplementation(() => [
      { email: 'test@example.com', keywords: ['kw'], subscription: null },
    ]);
    const sendSpy = jest.spyOn(svc as any, 'sendNotifications').mockImplementation(() => {});

    // First call resolves late with 2 items; second (overlapping) resolves earlier with 3 items
    jest.spyOn(mercariService as any, 'getLatestListings')
    .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([
      { id: '1', name: 'a' }, { id: '2', name: 'b' }, { id: '3', name: 'c' }
    ]), 70)))
    .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve([
      { id: '1', name: 'a' }, { id: '2', name: 'b' }
    ]), 10)));

    // advance to first interval start (50ms) -> first iteration starts and schedules its (100ms) listing resolution
     jest.advanceTimersByTime(50);
    await Promise.resolve();

    // advance to second interval start (another 50ms = 100ms overall) -> second iteration starts and schedules its (10ms) listing resolution
    jest.advanceTimersByTime(50);
    await Promise.resolve();

    // advance to when the second listing resolves (10ms later -> 110ms overall)
    jest.advanceTimersByTime(10);
    // allow async resolution to propagate
    await Promise.resolve();

    // advance to when the first listing resolves (70ms later -> 120ms overall)
    jest.advanceTimersByTime(10);
    // allow async resolution to propagate
    await Promise.resolve();

    // At this point, due to overlap, sendNotifications SHOULD NOT have been called on the "first logical run",
    // but the race makes it possible: assert that a notification was sent (demonstrates the race)
    expect(sendSpy).toHaveBeenCalled();

    // cleanup timers
    jest.clearAllTimers();
  });
});