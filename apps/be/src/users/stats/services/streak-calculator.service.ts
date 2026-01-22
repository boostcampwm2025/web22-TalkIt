import { Injectable } from '@nestjs/common';

import { DateUtil } from '@/common/utils/date.util';

// 학습 연속일(Streak) 계산을 담당하는 서비스
@Injectable()
export class StreakCalculatorService {
  // 마지막 학습일과 현재 상태를 기반으로 최신 스트릭을 반환하는 메서드
  calculate(lastUpdatedAt: Date | null | undefined, currentStreak: number): number {
    // 1. 첫 학습
    if (!lastUpdatedAt) return 1;

    const todayStr = DateUtil.getKstDateString();
    const lastDateStr = DateUtil.getKstDateString(lastUpdatedAt);

    // 2. 오늘 이미 학습함 (0일차 보정 포함)
    if (todayStr === lastDateStr) {
      return currentStreak === 0 ? 1 : currentStreak;
    }

    // 3. 어제 학습함 (연속 성공)
    const yesterdayStr = DateUtil.getYesterdayKstDateString();
    if (lastDateStr === yesterdayStr) {
      return currentStreak + 1;
    }

    // 4. 끊김 (초기화)
    return 1;
  }
}
