# localforage

_A FeathersJS client side service based on localforage that persists to IndexedDB, WebSQL, or LocalStorage_

## Overview

**feathers-localforage** is a database service adapter wrapping `localForage` that persists to either `IndexedDB`, `WebSQL`, or `LocalStorage` making it very useful for mobile and offline-first applications with the additional ability to seamlessly handle Blobs, TypedArrays, and other JS objects.

> [!IMPORTANT]
> **feathers-localforage** implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html)
> and [querying syntax]>(https://docs.feathersjs.com/api/databases/querying.html).

## Installation

Install with your preferred package manager:

::: code-group

```bash [pnpm]
pnpm add @kalisio/feathers-localforage
```

```bash [npm]
npm install @kalisio/feathers-localforage
```

```bash [yarn]
yarn add @kalisio/feathers-localforage
```

## Configuration

See the [clients](https://docs.feathersjs.com/api/client.html) chapter for more information about using Feathers in the browser and React Native.

### Browser

```html
<script type="text/javascript" src="//unpkg.com/@feathersjs/client"></script>
<script type="text/javascript" src="//unpkg.com/@kalisio/feathers-localforage"></script>
<script type="text/javascript">
  var service = feathersjsOfflineLocalforage.init({
    storage: ['indexeddb', 'websql', 'localStorage']
  });
  var app = feathers().use('/messages', service);

  var messages = app.service('messages');

  messages.on('created', function(message) {
    console.log('Someone created a message', message);
  });

  messages.create({
    text: 'Message created in browser'
  });
</script>
```