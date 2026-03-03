# Running the example

1. Generate vapid keys if needed

```shell
pnpm web-push generate-vapid-keys --json
```

2. Setup the required environment variables

* `VAPID_PUBLIC_KEY`
* `VAPID_PRIVATE_KEY`
* `VAPID_SUBJECT`

> [!TIP]
> `VAPID_SUBJECT` must be a valid `mailto:` email address or an HTTPS URL.

3. Start both server and client

```shell
pnpm dev
```

> [!TIP]
> By default:
> - The server listens on port `8081`. You can override it by setting the `SERVER_PORT` environment variable.
> - The client listens on port `8080`. You can override it by setting the `CLIENT_PORT` environment variable.