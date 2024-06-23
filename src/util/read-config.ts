import * as fs from 'node:fs';

export interface Config {
  host: string;
  port: number;
  secure: boolean;
  fromEmail: string;
  auth: {
    user: string;
    pass: string;
  }
  apiUser: string;
  apiPassword: string;
}

export const readConfig = () => JSON.parse(fs.readFileSync("/data/mercariwatch/config.json", { encoding: "utf-8" })) as Config;
