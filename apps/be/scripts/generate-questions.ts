/*
 * question-bank 질문 생성 스크립트
 * 사용법:
 *  ts-node scripts/generate-questions.ts -category OS -chapter 1 -count 10
 *  ts-node scripts/generate-questions.ts -category OS              # 전체 챕터
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { CURRICULA, Domain } from '../src/modules/question-bank/data';
import { QuestionBankModule } from '../src/modules/question-bank/question-bank.module';
import { QuestionBankService } from '../src/modules/question-bank/question-bank.service';

@Module({
  imports: [ConfigModule.forRoot(), QuestionBankModule],
})
class AppModule {}

function parseArgs() {
  const args = process.argv.slice(2);
  const res: Record<string, string | boolean> = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (typeof key !== 'string' || !key.startsWith('-')) continue;
    const val = args[i + 1];
    if (typeof val === 'undefined' || val.startsWith('-')) {
      res[key] = true;
    } else {
      res[key] = val;
      i++;
    }
  }
  return res;
}

async function main() {
  const parsed = parseArgs();
  const category = (typeof parsed['-category'] === 'string' ? parsed['-category'] : '') as Domain;
  const chapter = typeof parsed['-chapter'] === 'string' ? parseInt(parsed['-chapter'], 10) : 0;
  const count = typeof parsed['-count'] === 'string' ? parseInt(parsed['-count'], 10) : 10;

  if (!category || !['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'].includes(category)) {
    console.error(
      'Usage: ts-node scripts/generate-questions.ts -category OS|NETWORK|DB|DATA_STRUCTURE [-chapter N] [-count N]',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(QuestionBankService);

  if (chapter > 0) {
    console.log(`Generating ${count} questions for ${category} chapter ${chapter}...`);
    const result = await service.generateQuestions(category, chapter, count);
    console.log(`Done: ${result.total} questions generated in ${result.files.length} files`);
  } else {
    const curriculum = CURRICULA[category];
    console.log(
      `Generating questions for all ${curriculum.chapters.length} chapters of ${category}...`,
    );

    let totalQuestions = 0;
    let totalFiles = 0;
    for (const ch of curriculum.chapters) {
      console.log(`\n--- Chapter ${ch.chapter}: ${ch.title} ---`);
      const result = await service.generateQuestions(category, ch.chapter, count);
      totalQuestions += result.total;
      totalFiles += result.files.length;
    }
    console.log(`\nDone: ${totalQuestions} total questions in ${totalFiles} files`);
  }

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
