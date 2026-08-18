import { Injectable } from "@nestjs/common";
import fs from "node:fs";
import { Config } from "./config.interfaces";

@Injectable()
export class ConfigService {
  private readonly config: Readonly<Config>;

  constructor() {
    this.config = this.readConfig();
  }

  public getConfig(): Readonly<Config> {
    return this.config;
  }

  private readConfig(): Readonly<Config> {
    try {
      return this.setDefaults(JSON.parse(fs.readFileSync("./data/config.json", { encoding: "utf-8" })) as Config);
    } catch (e) {
      console.error("Failed to read configuration file! Application shutting down.");
      throw e;
    }
  }

  private setDefaults(config: Config): Readonly<Config> {

    // defaults
    const defaultConfigOptions: Config = {
      requestFrequencyMS: 90000,
      requestDelayMS: 1000,
      requestPages: 3,
      clearRequestsLimit: 25,
      maxLinksPerEmail: 30,
      verboseLogging: true,
      emailNotificationsEnabled: true,
      browserNotificationsEnabled: true,
      discordNotificationsEnabled: true
    }

    // set defaults if they're unspecified in the config
    for (const key of Object.keys(defaultConfigOptions) as Array<keyof typeof defaultConfigOptions>) {
      if (config && config[key] === undefined) {
        config[key] = defaultConfigOptions[key] as never;
        console.warn("Configuration option `" + key + "` was unspecified. Proceeding with application default: " + defaultConfigOptions[key]);
      }
    }

    // force a `requestFrequencyMS` of greater than 30000
    if (config?.requestFrequencyMS !== undefined && config.requestFrequencyMS < 30000) {
      config.requestFrequencyMS = 90000;
      console.warn("Configuration option `requestFrequencyMS` was less than 30000ms. Proceeding with application default of 90000ms to avoid rate limiting.");
    }

    if (config.emailNotificationsEnabled === false) {
      console.warn("Config option `emailNotificationsEnabled` is set to false. Email Notifications are disabled.")
    }

    if (config.browserNotificationsEnabled === false) {
      console.warn("Config option `browserNotificationsEnabled` is set to false. Browser Notifications are disabled.")
    }

    if (config.discordNotificationsEnabled === false) {
      console.warn("Config option `discordNotificationsEnabled` is set to false. Discord Notifications are disabled.")
    }

    // if verbose logging is disabled, hide all console logs
    if (!config.verboseLogging) {
      console.log = function () { };
    }

    return config;
  }
}
