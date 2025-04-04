import * as fs from 'node:fs';

export interface Config {
  emailNotificationConfig?: {
    host?: string;
    port?: number;
    secure?: boolean;
    mailFrom?: string;
    auth?: {
      user?: string;
      pass?: string;
    }
  },
  apiCredentials?: {
    user?: string;
    pass?: string;
  }
  browserNotificationConfig?: {
    mailTo?: string;
    vapidKeys?: {
      publicKey?: string;
      privateKey?: string;
    }
  }
  verboseLogging?: boolean;
  requestFrequencyMS?: number;
  requestDelayMS?: number;
  requestPages?: number;
  clearRequestsLimit?: number;
  maxLinksPerEmail?: number;
}

export const readConfig = () => {
  try {
    return JSON.parse(fs.readFileSync("./data/config.json", { encoding: "utf-8" })) as Config;
  } catch (e) {
    console.warn("Failed to read configuration file. Was this intentional?");
    return undefined
  }
}
