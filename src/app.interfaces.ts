import * as webPush from 'web-push';

export interface Watch {
  email: string;
  keywords: string[];
  subscription: webPush.PushSubscription | null;
}

export type KnownListings = string[];