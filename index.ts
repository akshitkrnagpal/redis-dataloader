import { Redis } from "ioredis";
import DataLoader from "dataloader";
import { entries, zipObject } from "lodash";

class RedisDataLoader {
  redis: Redis;
  loader: DataLoader<string, any>;
  loaders: Map<string, DataLoader<any, any>>;

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
            return this.loaders.get(loaderName!)?.load(loaderKey);
          });
          const finalValues = await Promise.all(promises);
          const strFinalValues = finalValues.map((v) => JSON.stringify(v));
          const obj = zipObject(keys, strFinalValues);
          let pipeline = redis.pipeline();
          for (const [key, value] of entries(obj)) {
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

  has(loaderName: string) {
    return this.loaders.has(loaderName);
  }

  add(loaderName: string, loader: DataLoader<any, any>) {
    if (this.loaders.has(loaderName))
      throw Error(`Loader with name '${loaderName}' already exists.`);
    this.loaders.set(loaderName, loader);
  }

  load(loaderName: string, loaderKey: string) {
    console.log("load", loaderName, loaderKey);
    this.loader.load(`${loaderName}:${loaderKey}`);
  }

  flushAll() {
    this.redis.flushall();
  }
}

export default RedisDataLoader;
