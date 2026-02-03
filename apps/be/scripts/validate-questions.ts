/*
 * question-bank 중복 검사 + final 생성 스크립트
 * 사용법:
 *  ts-node scripts/validate-questions.ts -category OS -chapter 1
 *  ts-node scripts/validate-questions.ts -category OS -folder "0.0.1 effort:high"
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
  const folder = typeof parsed['-folder'] === 'string' ? parsed['-folder'] : undefined;

  if (!category || !['OS', 'NETWORK', 'DB', 'DATA_STRUCTURE'].includes(category)) {
    console.error(
      'Usage: ts-node scripts/validate-questions.ts -category OS|NETWORK|DB|DATA_STRUCTURE [-chapter N]',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(QuestionBankService);

  // ANSI color helpers
  const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
  const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
  const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
  const magenta = (s: string) => `\x1b[35m${s}\x1b[0m`;
  const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;
  const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;

  let totalInput = 0;
  let totalOutput = 0;
  let totalTokens = 0;

  if (chapter > 0) {
    console.log(`Validating ${category} chapter ${chapter}...`);
    const result = await service.validateAndFinalize(category, chapter, folder);
    totalInput += result.tokenUsage.inputTokens;
    totalOutput += result.tokenUsage.outputTokens;
    totalTokens += result.tokenUsage.totalTokens;
    console.log(`Done: ${result.total} final questions, ${result.removed} duplicates removed`);
    console.log(`Saved to: ${result.filePath}`);
    for (const rq of result.removedQuestions) {
      console.log(`  ${red('✗ Removed #' + rq.index)}: ${rq.content}`);
      console.log(`    ${dim('reason: ' + rq.reason)}`);
    }
  } else {
    const curriculum = CURRICULA[category];
    console.log(`Validating all ${curriculum.chapters.length} chapters of ${category}...`);

    let totalFinal = 0;
    let totalRemoved = 0;
    for (const ch of curriculum.chapters) {
      console.log(`\n--- Chapter ${ch.chapter}: ${ch.title} ---`);
      try {
        const result = await service.validateAndFinalize(category, ch.chapter, folder);
        totalFinal += result.total;
        totalRemoved += result.removed;
        totalInput += result.tokenUsage.inputTokens;
        totalOutput += result.tokenUsage.outputTokens;
        totalTokens += result.tokenUsage.totalTokens;
        console.log(`  ${result.total} questions, ${result.removed} removed → ${result.filePath}`);
        for (const rq of result.removedQuestions) {
          console.log(`    ${red('✗ Removed #' + rq.index)}: ${rq.content}`);
          console.log(`      ${dim('reason: ' + rq.reason)}`);
        }
      } catch (e) {
        console.warn(`  Skipped: ${(e as any)?.message}`);
      }
    }
    console.log(`\nDone: ${totalFinal} total final questions, ${totalRemoved} duplicates removed`);
  }

  console.log('\n' + bold('═══════════════ Token Usage ═══════════════'));
  console.log(`  ${cyan('Input tokens')}:  ${totalInput.toLocaleString()}`);
  console.log(`  ${yellow('Output tokens')}: ${totalOutput.toLocaleString()}`);
  console.log(`  ${magenta('Total tokens')}:  ${bold(totalTokens.toLocaleString())}`);
  console.log(bold('═══════════════════════════════════════════'));

  await app.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
