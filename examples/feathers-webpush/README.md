# feathers-webpush

## Running the example

1. Setup the required environment variables

* `VAPID_PUBLIC_KEY`
* `VAPID_PRIVATE_KEY`
* `VAPID_SUBJECT`

> [!TIP]
> To generate the vapid keys, you can use the `web-push` CLI:
> ```shell
> pnpm web-push generate-vapid-keys --json
> ```
> This will output a JSON object containing your `publicKey` and `privateKey`.

> [!TIP]
> `VAPID_SUBJECT` must be a valid `mailto:` email address or an HTTPS URL.

2. Start both server and client

```shell
pnpm dev
```

> [!TIP]
> By default:
> - The server listens on port `8081`. You can override it by setting the `SERVER_PORT` environment variable.
> - The client listens on port `8080`. You can override it by setting the `CLIENT_PORT` environment variable.