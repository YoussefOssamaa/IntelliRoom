import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

dotenv.config();

const getRedisConnection = () => {
  if (process.env.REDIS_URL) {
    return new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      tls: {}
    });
  }
/* local connection for dev*/
  // return new IORedis({
  //   host: process.env.REDIS_HOST || '127.0.0.1',
  //   port: Number(process.env.REDIS_PORT || 6379),
  //   username: process.env.REDIS_USERNAME || undefined,
  //   password: process.env.REDIS_PASSWORD || undefined,
  //   db: Number(process.env.REDIS_DB || 0),
  //   maxRetriesPerRequest: null,
  //   enableReadyCheck: true
  // });
};

export const RENDER3D_QUEUE_NAME = 'render3D-queue';
export const render3DQueueConnection = getRedisConnection();

export const render3DQueue = new Queue(RENDER3D_QUEUE_NAME, {
  connection: render3DQueueConnection,
  defaultJobOptions: {
    attempts: Number(process.env.RENDER3D_JOB_ATTEMPTS ),
    backoff: {
      type: 'exponential',
      delay: Number(process.env.RENDER3D_JOB_BACKOFF_MS)
    },
    removeOnComplete: {
      age: Number(process.env.RENDER3D_JOB_TTL_SECONDS),
      count: 1000
    },
    removeOnFail: false
  }
});

export default render3DQueue;
