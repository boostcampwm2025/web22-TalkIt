import { useEffect, useState } from 'react';

import { ANSWER_PHASE, useAnswerFlow } from '@/features/learning/lib/contexts/answer-flow-context';

const AnswerSection = () => {
  const { phase, sttText, setSttText } = useAnswerFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const isSttLoading = phase === ANSWER_PHASE.STT_LOADING;
  const isSttDone = phase === ANSWER_PHASE.STT_DONE;
  const isEditEmpty = isEditing && !editText.trim();

  useEffect(() => {
    if (!isSttDone && isEditing) {
      setIsEditing(false);
    }
  }, [isSttDone, isEditing]);

  const shouldShow = phase !== ANSWER_PHASE.IDLE && phase !== ANSWER_PHASE.RECORDING;
  if (!shouldShow) return null;

  const handleEditStart = () => {
    setEditText(sttText ?? '');
    setIsEditing(true);
  };

  const handleEditDone = () => {
    setSttText(editText.trim());
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray bg-white p-8 shadow-sm after:absolute after:top-0 after:left-0 after:h-full after:w-1 after:bg-primary">
      <h3 className="sr-only">음성 인식 결과</h3>
      <div className="flex items-center justify-between">
        <p className="text-xl font-bold">나의 답변</p>
        {isSttDone && sttText?.trim() && (
          <div className="flex gap-2">
            {isEditing && (
              <button
                type="button"
                className="rounded-md border border-gray px-3 py-1 text-sm text-dark-gray hover:bg-gray/20"
                onClick={handleEditCancel}
              >
                수정 취소
              </button>
            )}
            <button
              type="button"
              className="rounded-md border border-gray px-3 py-1 text-sm text-dark-gray hover:bg-gray/20"
              onClick={isEditing ? handleEditDone : handleEditStart}
              disabled={isEditEmpty}
            >
              {isEditing ? '수정 완료' : '수정'}
            </button>
          </div>
        )}
      </div>
      <div className="mt-4 rounded-md">
        {isSttLoading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="loader-dots" />
            <p className="text-dark-gray">AI가 음성을 텍스트로 변환하고 있어요</p>
          </div>
        ) : isEditing ? (
          <>
            <textarea
              className={`w-full resize-none rounded-md border p-3 focus:outline-none ${
                isEditEmpty
                  ? 'border-red-500 focus:border-red-500'
                  : 'border-gray focus:border-primary'
              }`}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={4}
            />
            {isEditEmpty && <p className="mt-1 text-sm text-red-500">답변을 입력해 주세요</p>}
          </>
        ) : sttText?.trim() ? (
          <p>{sttText}</p>
        ) : (
          <p>음성이 인식되지 않았어요. 다시 녹음해 주세요</p>
        )}
      </div>
    </section>
  );
};

export default AnswerSection;
