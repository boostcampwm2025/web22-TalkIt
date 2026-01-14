import { useEffect, useState } from 'react';

import useQuestion from '@/lib/stores/learning-session';
import type { CreateQuestionResponseDTO } from '@repo/shared/types/learning';
import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import { FileText, Home, PanelLeft, PanelLeftClose } from 'lucide-react';

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
    topic: 'DATABASE',
    difficulty: 'MEDIUM',
    timeLimit: 300,
  },
};

const RootLayout = () => {
  const [isOpen, setIsOpen] = useState(true);

  // 이전 페이지에서 질문을 넣어주기 위해서 임시로 작성했습니다.
  const setQuestion = useQuestion((state) => state.setQuestion);

  useEffect(() => {
    setQuestion(mockQuestionResponse);
  }, [setQuestion]);

  return (
    <>
      <div className="flex h-screen">
        {/* 사이드바 컨테이너 */}
        <div
          className={`relative h-full shrink-0 overflow-hidden border-r border-gray bg-white transition-all duration-300 ease-in-out ${isOpen ? 'w-sidebar-open' : 'w-sidebar-close'}`}
        >
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute top-3 right-3 z-10 rounded-lg p-2 text-dark-gray transition-colors hover:bg-primary/10"
          >
            {isOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
          </button>

          <div className="flex h-full w-sidebar-open flex-col pt-14 text-dark-gray">
            <nav className="flex-1 space-y-1 overflow-y-auto p-5">
              <Link to="/" className="mb-6 flex items-center gap-5">
                <Home size={20} />
                <span>MyApp</span>
              </Link>
              <Link to="/about" className="mb-6 flex items-center gap-5">
                <FileText size={20} />
                <span>About</span>
              </Link>
              <Link to="/learning/question" className="mb-6 flex items-center gap-5">
                <FileText size={20} />
                <span>Question</span>
              </Link>
            </nav>
          </div>
        </div>

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
