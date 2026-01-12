import { NestFactory } from '@nestjs/core';

import { QuestionFactoryModule } from '../modules/question-factory/question-factory.module';
import { QuestionFactoryService } from '../modules/question-factory/question-factory.service';
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';

async function main() {
  const app = await NestFactory.createApplicationContext(QuestionFactoryModule, {
    logger: ['log', 'warn', 'error'],
  });
  const qfs = app.get(QuestionFactoryService);
  const seed = qfs.buildSeed('OS', 'os.pt.process_vs_thread');
  const result = await qfs.generate({ version: 'v1', nPerCell: 3, seed });

  console.log('Generation Result:', result);
  const expectedPath = path.resolve(
    process.cwd(),
    'output',
    'question-bank',
    'v1',
    'OS__os.pt.process_vs_thread.jsonl',
  );
  const exists = fs.existsSync(expectedPath);
  if (!exists) {
    console.error('검증 실패: 출력 파일이 존재하지 않습니다:', expectedPath);
    process.exit(2);
  }
  if (result.acceptedCount !== 18) {
    console.error('검증 실패: 수락 개수가 18이 아닙니다:', result.acceptedCount);
    process.exit(3);
  }
  console.log('검증 성공: 파일 존재 및 수락 개수 18');
  await app.close();
}

main().catch((e) => {
  console.error('검증 실행 오류:', e);
  process.exit(1);
});
