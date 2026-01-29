import { AssessmentRepository } from '../assessment.repository';
import { EvaluationOrchestratorService } from '../evaluation/application/evaluation-orchestrator.service';
import { ASSESS_QUEUE, ASSESS_REDIS, AssessmentWorker } from './assessment.worker';

// 간단한 큐 목(mock): getJob/add 호출 여부로 idempotency를 검증
class FakeQueue {
  public added: { name: string; data: any; opts: any }[] = [];
  constructor(private existingJobIds = new Set<string>()) {}
  async getJob(id: string) {
    return this.existingJobIds.has(id) ? ({ id } as any) : null;
  }
  async add(name: string, data: any, opts: any) {
    this.added.push({ name, data, opts });
    this.existingJobIds.add(String(opts?.jobId));
    return { id: opts?.jobId } as any;
  }
}

describe('AssessmentWorker.enqueue idempotency', () => {
  const mockUserCreditsRepository = {} as any;
  it('should not add a job if the same jobId already exists', async () => {
    const repo = {} as unknown as AssessmentRepository;
    const orchestrator = {} as unknown as EvaluationOrchestratorService;
    const queue = new FakeQueue(new Set(['answer-123'])) as any;
    const redis = {} as any;

    const worker = new AssessmentWorker(
      repo,
      orchestrator,
      mockUserCreditsRepository,
      queue,
      redis,
    );

    await worker.enqueue(123);
    expect(queue.added.length).toBe(0);
  });

  it('should add only once when called twice for the same answerId', async () => {
    const repo = {} as unknown as AssessmentRepository;
    const orchestrator = {} as unknown as EvaluationOrchestratorService;
    const queue = new FakeQueue() as any;
    const redis = {} as any;

    const worker = new AssessmentWorker(
      repo,
      orchestrator,
      mockUserCreditsRepository,
      queue,
      redis,
    );

    await worker.enqueue(456);
    await worker.enqueue(456);

    // 첫 호출에서만 add, 두번째는 getJob으로 감지되어 add 생략
    expect(queue.added.length).toBe(1);
    expect(queue.added[0]?.opts?.jobId).toBe('answer-456');
  });
});
