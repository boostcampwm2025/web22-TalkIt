import * as Dialog from '@radix-ui/react-dialog';

import { History, XCircle } from 'lucide-react';

type ResumeSessionModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResume: () => void;
  onAbort: () => void;
  isLoading: boolean;
};

const ResumeSessionModal = ({
  isOpen,
  onOpenChange,
  onResume,
  onAbort,
  isLoading,
}: ResumeSessionModalProps) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-in fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />

        <Dialog.Content className="animate-in fade-in-0 zoom-in-95 fixed top-[50%] left-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-lg duration-200">
          <div className="mb-4 flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <History className="h-8 w-8 text-primary" />
            </div>

            <Dialog.Title className="text-xl font-bold text-slate-900">
              진행 중인 학습이 있습니다
            </Dialog.Title>

            <Dialog.Description className="text-sm text-slate-500">
              이전에 완료하지 못한 학습 세션이 남아있습니다.
              <br />
              이어서 진행하시겠습니까?
            </Dialog.Description>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
            <button
              onClick={onResume}
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 font-bold text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:flex-1"
            >
              {isLoading ? '불러오는 중...' : '이어하기'}
            </button>
            <button
              onClick={onAbort}
              disabled={isLoading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
            >
              <XCircle className="h-4 w-4" />
              종료하기
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ResumeSessionModal;
