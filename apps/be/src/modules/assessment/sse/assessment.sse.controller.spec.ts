import { AssessmentRepository } from '../assessment.repository';
import { AssessmentSseController } from './assessment.sse.controller';
import { Observable, of } from 'rxjs';

// QueueEventBus 목: stream(jobId) 호출 시 전달된 observable을 그대로 반환
class FakeEventBus {
  constructor(private obs: Observable<any>) {}
  stream(jobId: string) {
    return this.obs;
  }
}

describe('AssessmentSseController - 스냅샷 DTO 매핑', () => {
  it('스냅샷이 AssessmentStreamEventDTO 형태로 방출된다', (done) => {
    // given: answer 소유권 OK, jobRow 존재
    const repo = {
      getAnswerWithRelations: async (answerId: number) => ({ id: answerId, userId: 1 }),
      getAssessmentJobByAnswerId: async (answerId: number) => ({
        id: 999,
        status: 'QUEUED',
        error: null,
      }),
    } as unknown as AssessmentRepository;

    // 이벤트 버스는 아무 이벤트도 내보내지 않음(스냅샷만 검증)
    const bus = new FakeEventBus(of());

    const ctrl = new AssessmentSseController(bus as any, repo);

    const obs = ctrl.sse({ id: 1 }, 1, '123');
    const sub = (obs as any).subscribe({
      next: (evt: any) => {
        const data: any = evt.data;
        expect(typeof data.jobId).toBe('number');
        expect(data.jobId).toBe(999); // DB job id
        expect(data.answerId).toBe(123);
        expect(typeof data.timestamp).toBe('string');
        expect(data.status).toBe('QUEUED');
        // 종료
        sub.unsubscribe();
        done();
      },
      error: done,
    });
  });
});
