---
title: feathers-mongodb-management
description: Overview of feathers-mongodb-management
---

# feathers-mongodb-management

**feathers-mongodb-management** provides [FeathersJS](https://feathersjs.com/) service adapters for managing MongoDB databases, users and collections.

## Principle

The initial use case was to simplify data segregation for SaaS applications where each user can belong to different organisations. Instead of applying a logical filter on a global service (e.g. `/users?org=orgId`), this plugin physically separates the data of each organisation in a dedicated database.

> [!NOTE]
> The objects returned by the services are metadata, not MongoDB driver instances. To create collection or user services you must retrieve the driver instance separately using the MongoDB client.

## Installation

Install with your preferred package manager:

```shell
pnpm add @kalisio/feathers-mongodb-management
```

```shell
npm install @kalisio/feathers-mongodb-management
```

```shell
yarn add @kalisio/feathers-mongodb-management
```

## Configuration

```js
import { MongoClient } from 'mongodb'
import feathers from '@feathersjs/feathers'
import plugin from '@kalisio/feathers-mongodb-management'

const app = feathers()

// Connect to MongoDB
const client = await MongoClient.connect('mongodb://127.0.0.1:27017')
const adminDb = client.db('admin').admin()

// Register the database management service
app.use('databases', plugin.database({ adminDb, client }))
const databaseService = app.service('databases')

// Create a new database
await databaseService.create({ name: 'my-db' })

// Retrieve the MongoDB DB instance to bind collection/user services
const db = client.db('my-db')

// Register the collection management service
app.use('collections', plugin.collection({ db }))
const collectionService = app.service('collections')
await collectionService.create({ name: 'my-collection' })

// Register the user management service
app.use('users', plugin.user({ db }))
const userService = app.service('users')
await userService.create({ name: 'my-user', password: 'secret', roles: ['readWrite'] })
```

### Database service options

| Option | Description |
|--------|-------------|
| `adminDb` | MongoDB admin DB object (`client.db(...).admin()`) |
| `client` | MongoDB `MongoClient` instance |

### Collection service options

| Option | Description |
|--------|-------------|
| `db` | MongoDB `Db` instance |

### User service options

| Option | Description |
|--------|-------------|
| `db` | MongoDB `Db` instance |
| `hasUserInfosCommand` | Use the `usersInfo` command (default: `true`). Set to `false` for MongoDB <= 2.4. |

> [!NOTE]
> Each service supports the standard FeathersJS query parameters: `$select`, `$sort`, `$skip`, `$limit`. The available methods are `find`, `create` and `remove`.
