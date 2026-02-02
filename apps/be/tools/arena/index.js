const Arena = require('bull-arena');

const arena = Arena(
  {
    BullMQ: require('bullmq').Queue,
    queues: [
      {
        name: 'assessment',
        hostId: 'local-redis',
        type: 'bullmq',
        redis: {
          url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        },
      },
    ],
  },
  {
    basePath: '/arena',
    disableListen: false,
  },
);

const port = Number(process.env.ARENA_PORT || 4568);
arena.listen(port, () => {
  console.log(`Arena running at http://localhost:${port}/arena`);
});
