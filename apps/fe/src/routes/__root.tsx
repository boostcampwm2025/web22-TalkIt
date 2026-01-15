import { useEffect } from 'react';

import { SideBar, SideBarMobile } from '@/components/SideBar';
import useQuestion from '@/lib/stores/learning-session';
import type { CreateQuestionResponseDTO } from '@repo/shared/types/learning';
import { Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const mockQuestionResponse: CreateQuestionResponseDTO = {
  sessionId: 1,
  currentQuestionCount: 1,
  remainedCredit: 5,
  question: {
    questionId: 101,
    content: '성능 최적화와 데이터 일관성 유지를 위한 격리 수준 선택 기준은?',
    guide: [
      'Read Committed',
      'Write Skew',
      'Lock Contention',
      'Concurrency',
      'Isolation Level Tuning',
    ],
    category: 'DATABASE',
    difficulty: 'MEDIUM',
    timeLimit: 300,
  },
};

const RootLayout = () => {
  // 이전 페이지에서 질문을 넣어주기 위해서 임시로 작성했습니다.
  const setQuestion = useQuestion((state) => state.setQuestion);

  useEffect(() => {
    setQuestion(mockQuestionResponse);
  }, [setQuestion]);

  return (
    <>
      <div className="flex h-screen">
        <SideBar />

        {/* 모바일 화면에서 아래 탭 바 */}
        <SideBarMobile />

        {/* 메인 콘텐츠 */}
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>

      <TanStackRouterDevtools />
    </>
  );
};

export const Route = createRootRoute({ component: RootLayout });
