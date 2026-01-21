import { Test } from '@nestjs/testing';

import { AssessmentRepository } from '../../assessment.repository';
import { ScoringService } from '../domain/scoring.service';
import { LlmEvaluationProvider } from '../infra/llm-evaluation.provider';
import { LlmFeedbackProvider } from '../infra/llm-feedback.provider';
import { EvaluationOrchestratorService } from './evaluation-orchestrator.service';

describe('EvaluationOrchestratorService (smoke)', () => {
  it('evaluates, stores score, builds feedback, stores feedback', async () => {
    const repo = {
      getAnswerWithRelations: jest.fn().mockResolvedValue({
        id: 1,
        answerText: 'This mentions A and C',
        question: {
          id: 10,
          content: 'Question content about A B C ...',
          mustInclude: ['A', 'B', 'C'],
        },
      }),
      setAnswerScore: jest.fn().mockResolvedValue(undefined),
      setAnswerFeedback: jest.fn().mockResolvedValue(undefined),
    } as unknown as AssessmentRepository;

    const evalProvider = {
      evaluate: jest.fn().mockResolvedValue({
        issues: [
          { type: 'strength', detail: 'ok', evidence: '', target: 'A', score: 10 },
          { type: 'missing', detail: 'miss', evidence: '', target: 'B', score: -15 },
          { type: 'misconception', detail: 'major', evidence: '', target: 'C', score: -25 },
        ],
        meta: {
          mustIncludeMatched: ['A', 'C'],
          mustIncludeMissing: ['B'],
          finalScore: 60,
          scoreDeterministic: true,
        },
      }),
    } as unknown as LlmEvaluationProvider;

    const feedbackProvider = {
      build: jest.fn().mockResolvedValue({
        accurate: ["'A' 개념을 정확히 설명했습니다."],
        improvement: ["'B' 부분이 누락되어 보완이 필요합니다."],
        keywords: ['A', 'B', 'C'],
      }),
    } as unknown as LlmFeedbackProvider;

    const moduleRef = await Test.createTestingModule({
      providers: [
        { provide: AssessmentRepository, useValue: repo },
        { provide: LlmEvaluationProvider, useValue: evalProvider },
        { provide: LlmFeedbackProvider, useValue: feedbackProvider },
        ScoringService,
        EvaluationOrchestratorService,
      ],
    }).compile();

    const svc = moduleRef.get(EvaluationOrchestratorService);

    const { issues, score } = await svc.evaluate(1);
    expect(Array.isArray(issues.issues)).toBe(true);
    expect(typeof score).toBe('number');
    expect(repo.setAnswerScore as any).toHaveBeenCalled();

    const { feedback } = await svc.buildFeedback(1, issues);
    expect(Array.isArray(feedback.accurate)).toBe(true);
    expect(repo.setAnswerFeedback as any).toHaveBeenCalled();
  });
});
