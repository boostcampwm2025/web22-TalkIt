import { Injectable, Logger } from '@nestjs/common';

import { ClovaService } from '@/infra/clova/clova.service';

import { GoldenSystemPrompt, GoldenUserPrompt } from '../prompt/prompt.template';

@Injectable()
export class LlmGoldenProvider {
  private readonly logger = new Logger(LlmGoldenProvider.name);
  constructor(private readonly clova: ClovaService) {}

  async generate(params: { questionSummary: string }): Promise<{
    definition: string;
    key_points: string[];
    examples?: string[];
    pitfalls?: string[];
  }> {
    const { questionSummary } = params;
    const messages = [
      { role: 'system' as const, content: GoldenSystemPrompt },
      { role: 'user' as const, content: GoldenUserPrompt(questionSummary) },
    ];
    const out = await this.clova.chat(messages, {
      temperature: 0.1,
      maxCompletionTokens: 1500,
      stream: false,
      thinking: { effort: 'medium' },
    });
    const text = (out.content ?? '').trim();
    // 1) 직파싱 → 2) 정리 후 파싱 → 3) 재요청(강조) → 실패 시 폴백
    try {
      return this.parseGoldenJson(text, questionSummary);
    } catch {
      // reinforce with stronger formatting/safety guidance
      const reinforce =
        '\n\n[IMPORTANT]\n마크다운/코드블록 금지. 반드시 유효한 JSON 한 줄로만 출력하세요. 문자열 값 내부 큰따옴표(\") 금지(필요 시 \\ \" 로 이스케이프). 백틱/줄바꿈 금지. 각 배열 요소는 120자 이내의 간결한 문장으로 작성.';
      const out2 = await this.clova.chat(
        [
          { role: 'system' as const, content: GoldenSystemPrompt },
          { role: 'user' as const, content: GoldenUserPrompt(questionSummary) + reinforce },
        ],
        { temperature: 0, maxCompletionTokens: 700, stream: false },
      );
      const text2 = (out2.content ?? '').trim();
      try {
        return this.parseGoldenJson(text2, questionSummary);
      } catch (e2) {
        this.logger.warn(
          `Golden parse failed, falling back minimal: ${(e2 as any)?.message ?? e2}`,
        );
        return { definition: questionSummary, key_points: [] };
      }
    }
  }

  private parseGoldenJson(text: string, questionSummary: string) {
    try {
      const json = JSON.parse(text);
      return this.toGolden(json, questionSummary);
    } catch {
      const cleaned = this.prepareLikelyJson(text);
      const json = JSON.parse(cleaned);
      return this.toGolden(json, questionSummary);
    }
  }

  private toGolden(json: any, questionSummary: string) {
    const def = String(json?.definition ?? questionSummary);
    const kp = Array.isArray(json?.key_points) ? json.key_points.map(String) : [];
    const ex = Array.isArray(json?.examples) ? json.examples.map(String) : [];
    const pf = Array.isArray(json?.pitfalls) ? json.pitfalls.map(String) : [];
    return { definition: def, key_points: kp, examples: ex, pitfalls: pf };
  }

  private prepareLikelyJson(s: string): string {
    let t = String(s ?? '').trim();
    // 코드블록 제거
    if (t.startsWith('```')) {
      t = t
        .replace(/^```[a-zA-Z0-9_-]*\n?/, '')
        .replace(/```\s*$/, '')
        .trim();
    }
    // 스마트 따옴표 치환
    t = t.replace(/[\u201C\u201D\u201E\u201F\u2033]/g, '"').replace(/[\u2018\u2019\u2032]/g, "'");

    // 첫 번째 완결된 JSON 객체만 절취(여러 객체/설명 혼재 대응)
    const i0 = t.indexOf('{');
    if (i0 >= 0) {
      let depth = 0;
      let inStr = false;
      let esc = false;
      for (let i = i0; i < t.length; i++) {
        const ch = t[i];
        if (inStr) {
          if (esc) {
            esc = false;
          } else if (ch === '\\') {
            esc = true;
          } else if (ch === '"') {
            inStr = false;
          }
        } else {
          if (ch === '"') inStr = true;
          else if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) {
              t = t.slice(i0, i + 1);
              break;
            }
          }
        }
      }
    }
    // 흔한 오류: 트레일링 콤마 제거
    t = t.replace(/,\s*([}\]])/g, '$1');
    return t.trim();
  }
}
