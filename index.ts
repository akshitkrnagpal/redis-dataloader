import { Redis } from "ioredis";
import DataLoader from "dataloader";
import { zip } from "lodash";

class RedisDataLoader {
  redis: Redis;
  loader: DataLoader<string, any>;
  loaders: Map<string, { loader: DataLoader<any, any>; ttl: number }>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.loader = new DataLoader(
      async (keys) => {
        try {
          const values = await redis.mget(...keys);
          const promises = keys.map((key, index) => {
            const value = values[index];
            if (value) return Promise.resolve(JSON.parse(value));
            const [loaderName, ...loaderKeyParts] = key.split(":");
            const loaderKey = loaderKeyParts.join(":");
            return this.loaders.get(loaderName!)?.loader.load(loaderKey);
          });
          const finalValues = await Promise.all(promises);
          const strFinalValues = finalValues.map((v) => JSON.stringify(v));
          const zippedObj = zip(keys, values, strFinalValues).filter(
            ([_, cachedValue, finalValue]) => cachedValue !== finalValue
          );
          let pipeline = redis.pipeline();
          for (const [key, _, value] of zippedObj) {
            pipeline = pipeline.set(key, value, "EX", 3600);
          }
          await pipeline.exec();
          return finalValues;
        } catch (e) {
          console.error("errorrrr", e);
        }
        return keys.map((keys) => null);
      },
      { cache: false }
    );
    this.loaders = new Map();
  }

  has(name: string) {
    return this.loaders.has(name);
  }

  add(
    name: string,
    batchLoadFn: DataLoader.BatchLoadFn<any, any>,
    ttl: number | undefined
  ) {
    if (this.loaders.has(name))
      throw Error(`Loader with name '${name}' already exists.`);
    this.loaders.set(name, {
      loader: new DataLoader(batchLoadFn, { cache: false }),
      ttl: ttl ?? 3600,
    });
  }

  load(name: string, key: string) {
    return this.loader.load(`${name}:${key}`);
  }

  flushAll() {
    this.redis.flushall();
  }
}

export default RedisDataLoader;
