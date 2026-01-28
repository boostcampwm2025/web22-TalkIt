import { AssessmentQueueEventBus } from './assessment.queue-events';

// bullmq의 QueueEvents를 목킹하여 외부 연결을 막음
jest.mock('bullmq', () => ({
  QueueEvents: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}));

describe('AssessmentQueueEventBus - 구독/정리(refCount + 타임아웃)', () => {
  jest.useFakeTimers();

  afterEach(() => {
    // 남아있는 타이머 정리 (열린 핸들 방지)
    jest.clearAllTimers();
  });

  afterAll(() => {
    // 테스트 종료 시 실제 타이머로 복원
    jest.useRealTimers();
  });

  it('구독 해제 후 refCount=0 이면 지연 후 subject가 정리된다', () => {
    const bus = new AssessmentQueueEventBus({} as any);
    const jobId = 'answer-1';

    const obs = bus.stream(jobId);
    const sub = obs.subscribe(() => {});
    // 구독 1 → refCount 1
    sub.unsubscribe();
    // 구독 해제 즉시 정리되지 않고 타임아웃 후 정리
    expect((bus as any).subjects.get(jobId)?.refCount ?? 0).toBe(0);

    // 5분 타이머 진행
    jest.advanceTimersByTime(5 * 60 * 1000);

    expect((bus as any).subjects.has(jobId)).toBe(false);
  });

  it('동시에 2개 구독이면 첫 해제에서 정리되지 않고, 모두 해제 후에만 정리된다', () => {
    const bus = new AssessmentQueueEventBus({} as any);
    const jobId = 'answer-2';

    const obs = bus.stream(jobId);
    const a = obs.subscribe(() => {});
    const b = obs.subscribe(() => {});

    a.unsubscribe();
    // 하나 해제 → refCount 1, subject 남아있음
    expect((bus as any).subjects.get(jobId)?.refCount ?? 0).toBe(1);

    b.unsubscribe();
    // 모두 해제 → refCount 0, 타이머 시작
    expect((bus as any).subjects.get(jobId)?.refCount ?? 0).toBe(0);

    jest.advanceTimersByTime(5 * 60 * 1000);
    expect((bus as any).subjects.has(jobId)).toBe(false);
  });
});
