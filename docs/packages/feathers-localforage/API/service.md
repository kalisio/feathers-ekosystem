---
title: Service
description: A Feathers service that provides basic methods for using **localForage** library
---

# Service

## `service (options)`

Returns a new service instance initialized with the given options.

```js
const service = require('@kalisio/feathers-localforage');

app.use('/messages', service({
  storage: ['IndexedDB', 'localStorage']
}));
app.use('/messages', service({ storage, id, startId, name, store, paginate }));
```

__Options:__

- `storage` (*optional*, default: `'INDEXEDDB'`) - The storage backend. Must be one or more of `'INDEXEDDB'`, `'WEBSQL'`, or `'LOCALSTORAGE'`. The adapter will use the same sequence as fall-back if the desired storage type is not supported on the actual device. Alternatively, you can supply an array of storage backends determining the priority of your choice.
- `version` (*optional*, default: `1.0`) - `localforage` driver version to use. Currently only `1.0` exists.
- `size` (*optional*, default `4980736`) - The maximum database size required. Default DB size is _JUST UNDER_ 5MB, as it's the highest size we can use without a prompt in any browser.
- `id` (*optional*, default: `'id'`) - The name of the id field property.
- `name` (*optional*, default: `'feathersjs-offline'`) - The name of the underlying localforage database. With local storage, this is used as a key prefix.
- `storeName` (*optional*, default: `'feathers'`) - The name of the datastore. Depending on the storage backend it could be the name of the key/value table in the database (eg WebSQL) or the key (eg local storage). Must be alphanumeric, with underscores.
- `store` (*optional*) - An object with id to item assignments to pre-initialize the data store.
- `dates` (*optional*, default `false`) - Convert ISO-formatted date strings to `Date` objects in result sets.
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service.
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size.
- `whitelist` (*optional*) - A list of additional query parameters to allow.
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` `null` to change multiple items. Can be `true` for all methods or an array of allowed methods (e.g. `[ 'remove', 'create' ]`).
- `reuseKeys` (*optional*, default: `false`) Allow duplicate keys (see `name`) i.e. last definition wins. Mostly useful for demonstration and testing purposes.

## Storing Blobs, TypedArrays, and other JS objects

As this is an implementation on top of `localForage` you can store any type in **feathers-localforage**; you aren't limited to strings like in `localStorage`. Even if `localStorage` is your storage backend, **feathers-localforage** automatically does `JSON.parse()` and `JSON.stringify()` when getting/setting values.

`feathers-localforage` supports storing all native JS objects that can be serialized to JSON, as well as ArrayBuffers, Blobs, and TypedArrays. Check the [localForage API docs](https://localforage.github.io/localForage/#data-api-setitem) for a full list of types supported. In addition, setting the option `dates` to `true` will make sure any ISO-formatted dates in your results will in fact be date objects and not text strings.

> All types are supported in every storage backend, though storage limits in `localStorage` make storing many large Blobs impossible.

We default to `indexedDB` if available and fall-back to `localStorage` as a last resort.
