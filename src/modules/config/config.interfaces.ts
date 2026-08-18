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
    emailNotificationsEnabled: boolean;
    browserNotificationsEnabled: boolean;
    discordNotificationsEnabled: boolean;
    verboseLogging: boolean;
    requestFrequencyMS: number;
    requestDelayMS: number;
    requestPages: number;
    clearRequestsLimit: number;
    maxLinksPerEmail: number;
}