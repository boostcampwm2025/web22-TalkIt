import { Link, createFileRoute } from '@tanstack/react-router';

import {
  BookOpen,
  ChevronRight,
  FileText,
  MessageCircle,
  Mic,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { type Variants, motion } from 'motion/react';

// 애니메이션 변수 설정
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const staggerContainer: Variants = {
  visible: { transition: { staggerChildren: 0.2 } },
};

const LandingPage = () => {
  return (
    <div className="flex w-full flex-col overflow-hidden bg-white">
      <section className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 text-center md:min-h-[70vh]">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="flex flex-col items-center gap-6"
        >
          {/* 장식용 뱃지 */}
          <div className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            <Sparkles className="h-4 w-4" />
            <span>CS 지식 AI 학습 서비스</span>
          </div>

          <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-black md:text-6xl">
            당신의 성장을 돕는
            <br />
            <span className="text-primary">AI CS 선생님</span>
          </h1>

          <p className="max-w-xl text-lg text-dark-gray md:text-xl">
            이제 CS 지식, 혼자 헤매지 마세요.
            <br />
            AI 선생님이 당신의 답변을 듣고 명확한 피드백으로
            <br />
            CS 지식 마스터의 길을 안내합니다.
          </p>

          <Link
            to="/learning"
            className="group mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg shadow-primary/30 transition-all hover:bg-primary/90 hover:shadow-xl active:scale-95"
          >
            지금 시작하기
            <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </motion.div>

        {/* 배경 데코레이션 (은은한 그라데이션) */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none absolute bottom-20 -left-20 h-72 w-72 rounded-full bg-blue-300/10 blur-3xl" />
      </section>

      {/* --------------------------------------------------------------------------------
       * 2. Features Section: 3가지 핵심 기능
       * -------------------------------------------------------------------------------- */}
      <section className="bg-pale-blue px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            className="mb-16 text-center"
          >
            <span className="mb-2 block text-sm font-bold text-primary">AI 선생님의 안내</span>
            <h2 className="text-3xl font-bold text-black md:text-4xl">
              길을 잃었을 때, AI 선생님이 이끌어줍니다.
            </h2>
            <p className="mt-4 text-dark-gray">
              혼자서 막막했던 CS 학습, AI 선생님이 명확한 방향을 제시하고
              <br className="hidden md:block" /> 당신의 잠재력을 최대한 발휘하도록 돕습니다.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 gap-8 md:grid-cols-3"
          >
            <FeatureCard
              icon={<Mic className="h-8 w-8 text-primary" />}
              title="1. 문제 진단 (음성 분석)"
              description="최신 STT(Speech-to-Text) 모델로 당신의 답변을 정확히 인식하고, 지금의 실력을 진단합니다."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-primary" />}
              title="2. 맞춤형 개선 (실시간 피드백)"
              description={`"이 부분은 설명이 부족해요." AI 선생님이 논리적 오류와 핵심 키워드 누락을 즉각적으로 파악합니다.`}
            />
            <FeatureCard
              icon={<Trophy className="h-8 w-8 text-primary" />}
              title="3. 꾸준한 성장 (게이미피케이션)"
              description="매일 학습하고 XP를 획득하세요. 티어를 올리고 배지를 모으는 즐거움으로 꾸준한 습관을 만듭니다."
            />
          </motion.div>
        </div>
      </section>

      {/* --------------------------------------------------------------------------------
       * 3. Journey Section: 학습 과정 3단계
       * -------------------------------------------------------------------------------- */}
      <section className="px-6 py-20 md:py-32">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mb-16 text-center"
          >
            <h2 className="text-3xl font-bold text-black md:text-4xl">
              AI 선생님과 함께하는 성장 여정
            </h2>
            <p className="mt-4 text-dark-gray">
              어려운 곡에서 시작하여, CS 지식 마스터가 되는 3단계
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 gap-6 md:grid-cols-3"
          >
            <JourneyCard
              icon={<BookOpen className="h-6 w-6 text-primary" />}
              step="1"
              title="현재 위치 파악 (주제 선택)"
              description="운영체제, 네트워크, 자료구조 등 당신이 약한 주제의 질문 카드를 선택하세요."
            />
            <JourneyCard
              icon={<MessageCircle className="h-6 w-6 text-primary" />}
              step="2"
              title="적극적인 학습 (말로 설명하기)"
              description="실전처럼 주어진 시간 내에 답변을 말로 설명하고 AI 선생님의 지도를 받으세요."
            />
            <JourneyCard
              icon={<FileText className="h-6 w-6 text-primary" />}
              step="3"
              title="마스터를 향한 도약 (리포트 확인)"
              description="AI 선생님의 상세 분석 리포트를 통해 더할 학습 방향을 잡고 성장하세요."
            />
          </motion.div>
        </div>
      </section>

      <section className="px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center shadow-2xl md:px-20"
        >
          <h2 className="text-3xl font-extrabold text-white md:text-4xl">지금 바로 시작하세요</h2>
          <p className="mt-4 text-white/80 md:text-lg">
            CS 학습, 이제 더 이상 혼자 힘들어하지 마세요.
            <br />
            AI 선생님과 함께 게임처럼 즐겁게 완벽 대비할 수 있습니다.
          </p>

          <div className="mt-10">
            <Link
              to="/learning"
              className="inline-block rounded-xl bg-white px-10 py-4 text-lg font-bold text-primary transition-transform hover:scale-105 active:scale-95"
            >
              지금 시작하기
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <motion.div
    variants={fadeInUp}
    className="flex flex-col rounded-2xl bg-white p-8 shadow-sm transition-shadow hover:shadow-md"
  >
    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
      {icon}
    </div>
    <h3 className="mb-3 text-xl font-bold text-black">{title}</h3>
    <p className="leading-relaxed text-dark-gray">{description}</p>
  </motion.div>
);

const JourneyCard = ({
  icon,
  step,
  title,
  description,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  description: string;
}) => (
  <motion.div
    variants={fadeInUp}
    className="group relative flex flex-col items-center rounded-2xl border border-gray bg-white p-8 text-center transition-all hover:border-primary/30 hover:bg-primary/5"
  >
    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-pale-blue transition-colors group-hover:bg-white">
      {icon}
    </div>
    <div className="mb-2 flex items-center justify-center gap-2">
      <h3 className="text-sm font-bold text-primary">{step}.</h3>
      <h3 className="text-lg font-bold text-black">{title}</h3>
    </div>

    <p className="text-sm leading-relaxed text-dark-gray">{description}</p>
  </motion.div>
);

// SEO 메타 태그 설정
export const Route = createFileRoute('/_public/')({
  component: LandingPage,
});
