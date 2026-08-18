import { Injectable } from "@nestjs/common";
import { ConfigService } from "../config/config.service";
import { WatchMatch } from "../mercari/mercari.interfaces";
import { MercariService } from "../mercari/mercari.service";
import { NotificationService } from "../notification/notification.service";
import { WatchService } from "../watch/watch.service";

@Injectable()
export class SearchService {

  constructor(private readonly mercariService: MercariService, private configService: ConfigService, private readonly watchService: WatchService, private readonly notificationService: NotificationService) {
    this.triggerSearch();
  }

  private async triggerSearch(): Promise<void> {
    const config = this.configService.getConfig();
    const frequency = config.requestFrequencyMS;
    let persistentKeywords: string[] = [];
    let running = false;
    let count = 0;
    let seenIDs: Set<string> = new Set<string>();

    const resetSeenIDs = () => {
      seenIDs = new Set<string>();
    };

    const searchForNewListings = async () => {
      count++;

      if (running) {
        console.log("Skipping Iteration: " + count + " - Prior search in progess.");
        count++;
        return;
      }

      running = true;
      const startTime = Date.now();

      try {
        console.log("Search Iteration: " + count);
        const watches = this.watchService.getWatches();

        if (watches.length === 0) {
          console.log("No watches found. No search will be conducted.");
        }

        const keywords = watches.map(watch => watch.keywords).flat();

        // if the number of watches changes, reset the seenIDs to refresh the search
        if (seenIDs.size !== 0 && persistentKeywords.toString() !== keywords.toString()) {
          console.log("Watch change detected. Searches will be refreshed.");
          resetSeenIDs();
        }

        persistentKeywords = keywords;

        // periodically reset the seenIDs every `clearRequestsLimit` iterations to keep ID list from growing too large 
        if (config.clearRequestsLimit && count % config.clearRequestsLimit === 0) {
          console.log("Request limit hit. Searches will be refreshed.");
          resetSeenIDs();
        }

        const iterationSeen = new Set<string>();
        const watchMatches: WatchMatch[] = [];

        if (keywords.length === 0) {
          console.log("No keywords  defined. No search will be conducted.");
        }

        for (const keyword of new Set(keywords)) {
          const listings = await this.mercariService.getLatestListings(keyword);

          // listings is sorted by created newest -> oldest
          const newestSeenListing = listings.find(listing => seenIDs.has(listing.id));

          // if there were no listings found, ignore
          if (listings.length === 0) {
            continue;
          }

          // find new items relative to the seenIDs and their created dates
          const newListings = listings.filter((item) => !seenIDs.has(item.id) && item.created > (newestSeenListing?.created ?? 0));

          // notify only if we have previously seen state (not on start-up or search refresh) 
          // and when at least one new listing was found
          if (seenIDs.size && newListings.length > 0) {
            watchMatches.push(...newListings.map(listing => { return { ...listing, keyword } }));
          }

          // add all listing ids to iterationSeen
          listings.forEach((item) => iterationSeen.add(item.id));
        }

        // send notifications for any matches
        if (watchMatches.length) {
          for (const watch of watches) {
            const matchesToSend: WatchMatch[] = watchMatches.filter(match => watch.keywords.includes(match.keyword))
            if (matchesToSend.length) {
              this.notificationService.sendNotifications(watch, matchesToSend);
            }
          }
        }

        // add all new IDs from this iteration to seenIDs
        iterationSeen.forEach(seen => seenIDs.add(seen));

      } catch (err) {
        console.warn("Error in Watch Service: ", err);
      } finally {
        console.log("Executed in " + (Date.now() - startTime) + "ms\n");
        running = false;
      }
    };

    searchForNewListings();
    setInterval(searchForNewListings, frequency);
  }
}