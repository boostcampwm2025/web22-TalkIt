import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/infra/database/prisma.service';
import {
  AssessmentJob,
  AssessmentStatus,
  ExtraQuestion,
  Prisma,
  Question,
  Session,
  UserAnswer,
} from '@prisma/client';

@Injectable()
export class AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 세션 ID로 세션을 조회합니다.
   * 존재하지 않으면 null을 반환합니다.
   */
  findSessionById(sessionId: number): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { id: sessionId } });
  }

  /**
   * 사용자 답변을 생성합니다.
   * 선택적 필드(questionId, extraQuestionId)는 값이 없을 경우 null로 저장합니다.
   * 생성된 `UserAnswer` 엔티티를 반환합니다.
   */
  createUserAnswer(data: {
    userId: number;
    sessionId: number;
    answerText: string;
    timeSpentSec: number;
    questionId?: number;
    extraQuestionId?: number;
  }): Promise<UserAnswer> {
    // 파라미터 데이터를 사용하여 사용자 답변을 생성합니다.
    // 검증은 서비스 계층에서 수행된다고 가정합니다.
    return this.prisma.userAnswer.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        // Prisma의 선택적 Int 필드는 number | null이므로 undefined를 null로 정규화
        questionId: data.questionId ?? null,
        extraQuestionId: data.extraQuestionId ?? null,
        answerText: data.answerText,
        timeSpentSec: data.timeSpentSec,
        overallScore: null,
        // JSON 컬럼: DB NULL을 원할 땐 Prisma.DbNull 사용
        evaluationJson: Prisma.JsonNull,
        feedbackJson: Prisma.JsonNull,
      },
    });
  }

  /**
   * 주어진 답변 ID에 대한 평가 잡을 생성합니다.
   * 초기 상태는 QUEUED로 저장되며, 생성된 `AssessmentJob`을 반환합니다.
   */
  createAssessmentJob(answerId: number): Promise<AssessmentJob> {
    return this.prisma.assessmentJob.create({
      data: {
        answerId,
        status: AssessmentStatus.QUEUED,
      },
    });
  }

  /**
   * 답변 생성과 평가 작업 생성(초기 QUEUED)을 하나의 트랜잭션으로 처리합니다.
   * 큐 등록은 트랜잭션 범위 밖에서 수행되어야 하므로 서비스 계층에서 후속 처리합니다.
   */
  createAnswerAndJob(data: {
    userId: number;
    sessionId: number;
    answerText: string;
    timeSpentSec: number;
    questionId?: number;
    extraQuestionId?: number;
  }): Promise<{ answer: UserAnswer; job: AssessmentJob }> {
    return this.prisma.$transaction(async (tx) => {
      const answer = await tx.userAnswer.create({
        data: {
          userId: data.userId,
          sessionId: data.sessionId,
          // 선택적 Int 필드 정규화
          questionId: data.questionId ?? null,
          extraQuestionId: data.extraQuestionId ?? null,
          answerText: data.answerText,
          timeSpentSec: data.timeSpentSec,
          overallScore: null,
          // JSON 컬럼: DB NULL을 원할 땐 Prisma.DbNull 사용
          evaluationJson: Prisma.JsonNull,
          feedbackJson: Prisma.JsonNull,
        },
      });

      const job = await tx.assessmentJob.create({
        data: {
          answerId: answer.id,
          status: AssessmentStatus.QUEUED,
        },
      });

      return { answer, job } as const;
    });
  }

  /**
   * `answerId`로 단일 평가 잡을 조회합니다.
   *
   * Prisma 스키마에서 `AssessmentJob.answerId`는 `@unique`로 보장됩니다.
   * 따라서 `findUnique` 사용이 타당하며, 최대 1건만 반환됩니다.
   */
  getAssessmentJobByAnswerId(answerId: number): Promise<AssessmentJob | null> {
    return this.prisma.assessmentJob.findUnique({
      where: { answerId },
    });
  }

  /**
   * 평가 잡 정보를 갱신합니다.
   * `jobId`로 대상을 찾고, 전달된 업데이트 입력값을 적용한 결과를 반환합니다.
   */
  updateAssessmentJob(
    jobId: number,
    data: Prisma.AssessmentJobUpdateInput,
  ): Promise<AssessmentJob> {
    return this.prisma.assessmentJob.update({ where: { id: jobId }, data });
  }

  /**
   * 답변과 연관된 세션/문항 정보를 함께 조회합니다.
   * 존재하지 않으면 null을 반환합니다.
   */
  getAnswerWithRelations(answerId: number): Promise<
    | (UserAnswer & {
        session: Session;
        question: Question | null;
        extraQuestion: ExtraQuestion | null;
      })
    | null
  > {
    return this.prisma.userAnswer.findUnique({
      where: { id: answerId },
      include: { session: true, question: true, extraQuestion: true },
    });
  }

  /**
   * 답변의 총점을 설정합니다.
   * 업데이트된 `UserAnswer`를 반환합니다.
   */
  setAnswerScore(answerId: number, score: number): Promise<UserAnswer> {
    return this.prisma.userAnswer.update({
      where: { id: answerId },
      data: { overallScore: score },
    });
  }

  /**
   * 답변의 평가 결과(evaluationJson)를 설정합니다.
   * 업데이트된 `UserAnswer`를 반환합니다.
   */
  setAnswerEvaluation(answerId: number, evaluation: Prisma.InputJsonValue): Promise<UserAnswer> {
    return this.prisma.userAnswer.update({
      where: { id: answerId },
      data: { evaluationJson: evaluation },
    });
  }

  /**
   * 답변의 피드백(feedbackJson)을 설정합니다.
   * 업데이트된 `UserAnswer`를 반환합니다.
   */
  setAnswerFeedback(answerId: number, feedback: Prisma.InputJsonValue): Promise<UserAnswer> {
    return this.prisma.userAnswer.update({
      where: { id: answerId },
      data: { feedbackJson: feedback },
    });
  }

  // 트랜잭션 헬퍼
  /**
   * Prisma 트랜잭션 컨텍스트에서 전달된 콜백을 실행합니다.
   * 콜백이 반환하는 제네릭 타입 T를 그대로 반환합니다.
   */
  withTransaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }
}
