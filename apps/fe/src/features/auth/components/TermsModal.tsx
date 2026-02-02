import * as Dialog from '@radix-ui/react-dialog';

import { X } from 'lucide-react';

type TermsModalProps = {
  title: string;
  content: string;
  trigger: React.ReactNode;
};

export const TermsModal = ({ title, content, trigger }: TermsModalProps) => {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] fixed top-[50%] left-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl border border-gray bg-white p-6 shadow-lg duration-200 sm:rounded-2xl">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-bold text-black">{title}</Dialog.Title>
            <Dialog.Close className="rounded-full p-1 text-dark-gray hover:bg-gray hover:text-black focus:outline-none">
              <X size={20} />
            </Dialog.Close>
          </div>
          <div className="max-h-[60vh] overflow-y-auto rounded-lg border border-gray bg-pale-blue p-4">
            <Dialog.Description className="text-sm leading-relaxed whitespace-pre-wrap text-dark-gray">
              {content}
            </Dialog.Description>
          </div>
          <div className="flex justify-end">
            <Dialog.Close className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
              확인
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
