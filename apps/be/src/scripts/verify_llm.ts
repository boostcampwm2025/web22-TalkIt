import { NestFactory } from '@nestjs/core';

import { QuestionFactoryModule } from '../modules/question-factory/question-factory.module';
import { QuestionFactoryService } from '../modules/question-factory/question-factory.service';
import 'dotenv/config';
import 'reflect-metadata';

async function main() {
  // Force real LLM mode for this script
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  process.env.LLM_MODE = 'real';

  const app = await NestFactory.createApplicationContext(QuestionFactoryModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const qfs = app.get(QuestionFactoryService);
    const seed = qfs.buildSeed('OS', 'os.pt.process_vs_thread');
    const result = await qfs.generate({ version: 'v1', nPerCell: 1, seed });
    console.log('LLM Generation Result:', result);
    console.log('Output path:', result.outputPath);
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error('verify_llm failed:', e);
  process.exit(1);
});
