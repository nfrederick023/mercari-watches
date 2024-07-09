<p align="center">
  <a href="https://jp.mercari.com/en/" target="blank"><img src="https://www.remambo.jp/img/mercari-logo.png" width="200" alt="Nest Logo" /></a>
</p>

# Mercari Watches

Recieve email and browser notifications whenever new items on [jp.mercari.com](https://jp.mercari.com/en/) match your keywords!

## Getting Started

1. Create a directory for Mercari Watches.

```
mkdir mercariwatches
cd mercariwatches
mkdir data
```

2. Download docker-compose.yml and the example config.json:

```
wget -O docker-compose.yml https://raw.githubusercontent.com/nfrederick023/mercari-watches/master/docker-compose.yml
wget -O data/config.json https://raw.githubusercontent.com/nfrederick023/mercari-watches/master/example-config.json
```

3. Populate the config.json file [following the configuration guide](https://github.com/nfrederick023/mercari-watches?tab=readme-ov-file#configuration).

4. Start the container

```
docker compose up -d
```

5. Begin using the application following the usage guide.

## Configuration

Mercari Watches uses two JSON files for configuration and user data management.

- `config.json` - For application configuration (e.g. API keys, email auth)
- `watches.json` - For persisting user data (e.g. search terms, subscriptions)

`watches.json` is automatically generated and managed by the application. Ideally you'd only interact with this file when migrating systems, backing up/restoring data or for development. This file can be edited safely on fly; however, this is discouraged. The file is created and found in the same directory as `config.json`.

`config.json` must be created and managed by you. Whilst the file itself (and every parameter therein) is **optional**, a correct configuration file is mandatory in order to secure API endpoints, send email notifications, and create browser notifications. The `config.json` should be located at the `[appDir]/data/config.json` directoy, and within it you can configure the following options:

### config.json options

- `verboseLogging` - If non-warning system logs should be printed (true) or not (false). If unspecified, verboseLogging will be enabled by default.
- `apiCredentials` - Authorization credentials to secure API access. If unspecified, the applications's API will be unsecured and public.
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
- `browserNotificationConfig` - Configuration for browser notifications (webpush). If unspecified, browser notifications will be disabled.
  - `mailTo` - The contact for the push service.
  - `vapidKeys` - VAPID specification credentials.
    - `publicKey` - VAPID public key.
    - `privateKey` - VAPID private key.
- `requestFrequencyMS` - How often the application checks for new items. If unspecified, the default is 90000ms.
- `requestDelayMS` - The delay between each individual request to Mercari. If unspecified, the default is 1000ms.
- `requestPages` - How many pages should be considered in the search request. If unspecified, the default is 3 pages.

If any of the configuration parameters are incorrect, or if the file is unreadable/not found, the application will issue a `console.warn()` with a relevant warning.

Please see [the example-config.json](https://github.com/nfrederick023/mercari-watches/blob/master/example-config.json) to understand the complete format.

## Usage

On application start, Mercari Watches will automatically check for new items every [`requestFrequencyMS`] without any additional input from the user; however, it will only do so if it's provided search terms to query for in the `watches.json`.

To provide data to `watches.json` the application exposes a variety of APIs, all of which are useable from Swagger. Swagger can be accessed at following URL:

```
http://your_server_ip_here/api#/
```

Note: When the `apiCredentails` configuration option is set, all API requests are authenticated using Basic access authentication. This will be handled automatically by Swagger.

| Endpoint                | Method | Description                                                                                                     | Notes                       |
| :---------------------- | :----- | :-------------------------------------------------------------------------------------------------------------- | --------------------------- |
| /getWatches             | GET    | Returns the entirety of the `watches.json` file.                                                                |                             |
| /createWatch            | POST   | Adds a new watch entry in the `watches.json` file with no search keywords or subscriptions for the given email. |                             |
| /addKeywordToWatch      | PUT    | Adds a new search keyword to the given email.                                                                   |                             |
| /removeKeywordFromWatch | PUT    | Removes a search keyword from the given email.                                                                  |                             |
| /setKeywordsOfWatch     | PUT    | Replaces all of the search keywords for the given email with a new list of search keywords.                     |                             |
| /removeWatch            | DELETE | Removes any watch entries from the `watches.json` file matching the given email.                                |                             |
| /resetWatches           | DELETE | Removes all data from the `watches.json` file and resets the file to its intial state.                          |                             |
| /subscribe              | POST   | Directs all browser notifications for the given email to current the user.                                      | Must be handled in-browser. |
| /unsubscribe            | PUT    | Removes all browser notifications for the given email.                                                          |                             |

### The Steps to use Mercari Watches.

1. Naviate to the Swagger.
2. Use `/createWatch` to add an email to `watches.json`.
3. Use `/addKeywordToWatch` or `/setKeywordsOfWatch` to add search keywords to the email.
4. Mercari Watches will now "watch" for new items, for that email, and all its search keywords.
5. Use `/subscribe` to recieve all browser notifications for the email.
6. Once a new item is found, the email will recieve a message with links to the item and a browser notification will sent be sent to whomever is subscribed.
7. Use `/removeWatch` to remove an email from `watches.json`.

## A Note on API Rate Limiting

While Mercari has loose API Rate limiting restrictions, there still exists measures to temporarily block all requests from an IP if too many are made in a short period of time. To prevent this from happening, adjust your configuration accordingly. If you're unsure, use the default values of 90000 for `requestFrequencyMS` and 1000 for `requestDelayMS`. This will provide a long enough delay between bursts of requests to stop Mercari's API Rate limiting from kicking in.

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

Swagger URL:

```
http://localhost:3080/
```
