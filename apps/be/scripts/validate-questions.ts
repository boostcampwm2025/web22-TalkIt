/*
 * question-bank 중복 검사 + final 생성 스크립트
 * 사용법:
 *  ts-node scripts/validate-questions.ts -category OS -chapter 1
 *  ts-node scripts/validate-questions.ts -category OS              # 전체 챕터
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

  if (!category || !['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'].includes(category)) {
    console.error(
      'Usage: ts-node scripts/validate-questions.ts -category OS|NETWORK|DB|DATA_STRUCTURE [-chapter N]',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(QuestionBankService);

  if (chapter > 0) {
    console.log(`Validating ${category} chapter ${chapter}...`);
    const result = await service.validateAndFinalize(category, chapter);
    console.log(`Done: ${result.total} final questions, ${result.removed} duplicates removed`);
    console.log(`Saved to: ${result.filePath}`);
  } else {
    const curriculum = CURRICULA[category];
    console.log(`Validating all ${curriculum.chapters.length} chapters of ${category}...`);

    let totalFinal = 0;
    let totalRemoved = 0;
    for (const ch of curriculum.chapters) {
      console.log(`\n--- Chapter ${ch.chapter}: ${ch.title} ---`);
      try {
        const result = await service.validateAndFinalize(category, ch.chapter);
        totalFinal += result.total;
        totalRemoved += result.removed;
        console.log(`  ${result.total} questions, ${result.removed} removed → ${result.filePath}`);
      } catch (e) {
        console.warn(`  Skipped: ${(e as any)?.message}`);
      }
    }
    console.log(`\nDone: ${totalFinal} total final questions, ${totalRemoved} duplicates removed`);
  }

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
