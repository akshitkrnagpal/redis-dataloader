# Redis DataLoader

> ⚠️ **DEPRECATED**: This package is deprecated. Please use [keyv-dataloader](https://github.com/akshitkrnagpal/keyv-dataloader) instead (available on [npm](https://www.npmjs.com/package/keyv-dataloader)).

A utility for caching and batching database operations with Redis.

## Overview

`redis-dataloader` is a library that combines the power of Facebook's [DataLoader](https://github.com/graphql/dataloader) with [Redis](https://redis.io/) for efficient data caching and batch loading. It helps prevent the N+1 queries problem in your applications while providing a Redis-backed caching layer.

## Installation

```bash
# Using npm
npm install @akshitkrnagpal/redis-dataloader

# Using yarn
yarn add @akshitkrnagpal/redis-dataloader
```

## Usage

```typescript
import Redis from 'ioredis';
import RedisDataLoader from '@akshitkrnagpal/redis-dataloader';

// Create a Redis client
const redis = new Redis();

// Initialize the RedisDataLoader with your Redis client
const redisDataLoader = new RedisDataLoader(redis);

// Add a new loader with a custom batch loading function
redisDataLoader.add('users', async (keys) => {
  // Fetch data from your database in batches
  const users = await db.users.findMany({ where: { id: { in: keys } } });
  
  // Return data in the same order as the requested keys
  return keys.map(key => users.find(user => user.id === key) || null);
}, 3600); // TTL in seconds (optional, defaults to 3600)

// Load data using the loader
const user = await redisDataLoader.load('users', '123');

// Check if a loader exists
const hasLoader = redisDataLoader.has('users');

// Clear all cached data
redisDataLoader.flushAll();
```

## Features

- **Batching**: Automatically batches multiple requests to the same resource for efficient loading
- **Caching**: Utilizes Redis for high-performance distributed caching
- **TTL support**: Configurable expiration time for cached entries
- **TypeScript support**: Built with and fully supports TypeScript

## API

### Constructor

```typescript
new RedisDataLoader(redis: Redis)
```

### Methods

- `add(name: string, batchLoadFn: DataLoader.BatchLoadFn<any, any>, ttl?: number)`: Registers a new loader with the specified name, batch loading function, and optional TTL (in seconds)
- `load(name: string, key: string)`: Loads data by the given loader name and key
- `has(name: string)`: Checks if a loader with the specified name exists
- `flushAll()`: Clears all cached data in Redis

## License

MIT
