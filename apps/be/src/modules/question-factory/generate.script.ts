import { NestFactory } from '@nestjs/core';

import { AppModule } from '../../../app.module';
import { QuestionFactoryService } from './question-factory.service';
import { ConceptLevel, Domain, QuestionDepth } from './types';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const service = app.get(QuestionFactoryService);

  const domain = (process.env.QF_DOMAIN ?? 'OS') as Domain;
  const level = (process.env.QF_LEVEL ?? 'Basic') as ConceptLevel;
  const depth = (process.env.QF_DEPTH ?? 'Low') as QuestionDepth;
  const count = Number(process.env.QF_COUNT ?? '5');
  const term = process.env.QF_TERM;

  console.log(
    `생성 시작: domain=${domain} level=${level} depth=${depth} count=${count} term=${term ?? '(없음)'}`,
  );

  const result = await service.generate({
    domain,
    conceptLevel: level,
    questionDepth: depth,
    count,
    term,
  });

  console.log(`완료: ${result.data.length}개 생성 → ${result.outputPath}`);

  await app.close();
}

main().catch((err) => {
  console.error('생성 실패:', err);
  process.exit(1);
});
