<p align="center">
  <a href="https://jp.mercari.com/en/" target="blank"><img src="https://www.remambo.jp/img/mercari-logo.png" width="200" alt="Nest Logo" /></a>
</p>

# Mercari Watches

Recieve email and desktop notifications whenever new items on [jp.mercari.com](https://jp.mercari.com/en/) match your keywords!

## Getting Started

Using Docker:

## Configuration

Mercari Watches uses two JSON files for configuration and user data management.

- `config.json` - For application configuration (e.g. API keys, email auth)
- `watches.json` - For persisting user data (e.g. search terms, subscriptions)

`watches.json` is automatically generated and managed by the application. Ideally you'll only interact with this file if you are migrating systems, backing up/restoring data or for development purposes. This file can be edited safely on fly; however, this is discouraged. The file is created and found in the same directory as `config.json`.

`config.json` must be created and managed by you. Whilst the file itself (and every parameter therein) is **optional**, a correct configuration file is mandatory in order to secure API endpoints, send email notifications, and create desktop notifications.

In your filesystem the `config.json` file should be located in this directory: `[appDir]/data/config.json` and you can specify the following parameters:

### config.json

```json
{
  "verboseLogging": true,
  "apiCredentails": {
    "user": "admin",
    "pass": "password"
  },
  "emailNotificationConfig": {
    "host": "email.host.net",
    "port": 25,
    "secure": false,
    "mailFrom": "email@email.com",
    "auth": {
      "user": "user",
      "pass": "password"
    }
  },
  "desktopNotificationConfig": {
    "mailTo": "email@email.com",
    "vapidKeys": {
      "publicKey": "public_vapid_key",
      "privateKey": "private_vapid_key"
    }
  },
  "requestFrequencyMS": 90000,
  "requestDelayMS": 1000,
  "requestPages": 3
}
```

Further explanation of each parameter:

- `verboseLogging` - If non-warning system logs should be printed (true) or not (false). If unspecified, verboseLogging will be enabled by default.
- `apiCredentails` - Authorization credentials to secure API access. If unspecified, the applications's API will be unsecured and public.
  - `user` - API access username.
  - `pass` - API access password.
- `emailNotificationConfig` - Configuration for email notifications (SMTP Transport). If unspecified, email notifications will be disabled.
  - `host` - Connection hostname. (e.g. smtp.sendgrid.net).
  - `port` - Connection port (e.g. 25).
  - `secure` - If the connection should use SSL (true) or not (false).
  - `mailFrom` - Sender for emails.
  - `auth` - Access credentials for the connection.
    - `user` - Connection username.
    - `pass` - Connection password.
- `desktopNotificationConfig` - Configuration for desktop notifications (webpush). If unspecified, desktop notifications will be disabled.
  - `mailTo` - The contact for the push service.
  - `vapidKeys` - VAPID specification credentials.
    - `publicKey` - VAPID public key.
    - `privateKey` - VAPID private key.
- `requestFrequencyMS` - How often the application checks for new items. If unspecified, the default is 90000ms.
- `requestDelayMS` - The delay between each individual request to Mercari. If unspecified, the default is 1000ms.
- `requestPages` - How many pages should be considered in the search request. If unspecified, the default is 3 pages.

If any of the configuration parameters are incorrect, or if the file is unreadable/not found, the application will issue a `console.warn()` with a relevant warning.

## Development

Installation:

```bash
$ npm install
```

Running the app:

```bash
# build
$ npm run start

# development
$ npm run start:dev

# production mode
$ npm run start:prod
```
