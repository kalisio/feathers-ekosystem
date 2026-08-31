# feathers-distributed

__

---

## Documentation

Detailed documentation is available at the following [link](https://kalisio.github.io/feathers-ekosystem/pacakges/feathers-distributed).

In the tests four apps are actually created, each app has a distribution key corresponding to its index:
- a gateway (index 0) with a local `users` service then a dynamically added local `custom` service with an additional `custom` event (`created`/`custom` events distributed)
- a first app (index 1) without any local service but with the distributed gateway services
- a second app (index 2) without any local service but with the distributed gateway services
- a third app (index 3) with a local `no-events` service with an additional `custom` event (all events distributed) and with the distributed gateway services
The `custom` service is exposed remotely on a new `custom-name` name.

## License

Licensed under the [MIT license](LICENSE).

Copyright (c) 2026-present [Kalisio](https://kalisio.com)

<a href="https://kalisio.com">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://kalisio.github.io/kalisioscope/kalisio/kalisio-logo-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="https://kalisio.github.io/kalisioscope/kalisio/kalisio-logo-light.svg">
    <img alt="Kalisio" src="https://kalisio.github.io/kalisioscope/kalisio/kalisio-logo-light.svg" height="96">
  </picture>
</a>