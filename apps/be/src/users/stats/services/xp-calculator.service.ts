import { Injectable } from '@nestjs/common';

import { Difficulty } from '@/common/enums/learning.enum';

// XP 계산에 필요한 가중치 및 설정값 상수
const XP_CONFIG = {
  BASE_SESSION_XP: 100,
  BONUS: {
    DIFFICULTY: { HARD: 0.5, MEDIUM: 0.2, EASY: 0 },
    DEEP_DIVE_PER_Q: 20,
  },
};

// 학습 결과에 따른 XP 획득량 계산을 담당하는 서비스
@Injectable()
export class XpCalculatorService {
  // 난이도와 답변(꼬리 질문 여부)을 기반으로 최종 획득 XP를 계산하는 메서드
  calculate(difficulty: Difficulty, answers: { extraQuestionId: string | null }[]) {
    // 1. 기본 XP
    const baseXp = XP_CONFIG.BASE_SESSION_XP;

    // 2. 난이도 보너스
    let multiplier = XP_CONFIG.BONUS.DIFFICULTY.EASY;
    if (difficulty === Difficulty.HARD) multiplier = XP_CONFIG.BONUS.DIFFICULTY.HARD;
    else if (difficulty === Difficulty.MEDIUM) multiplier = XP_CONFIG.BONUS.DIFFICULTY.MEDIUM;

    const difficultyBonus = Math.floor(baseXp * multiplier);

    // 3. 딥다이브 보너스
    const tailCount = answers.filter((a) => !!a.extraQuestionId).length;
    const deepDiveBonus = tailCount * XP_CONFIG.BONUS.DEEP_DIVE_PER_Q;

    return {
      totalGainedXp: baseXp + difficultyBonus + deepDiveBonus,
      detail: {
        baseXp,
        difficultyBonus: difficultyBonus > 0 ? difficultyBonus : null,
        deepDiveBonus: deepDiveBonus > 0 ? deepDiveBonus : null,
      },
    };
  }
}
