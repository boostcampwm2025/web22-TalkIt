import type { QUESTION_DIFFICULTY_CONFIG } from '@/constants/question';
import type { QuestionDifficulty } from '@repo/shared/constants/learning';

type DifficultySelectorProps = {
  isVisible: boolean;
  options: (typeof QUESTION_DIFFICULTY_CONFIG)[keyof typeof QUESTION_DIFFICULTY_CONFIG][];
  selectedDifficulty: QuestionDifficulty | null;
  onSelect: (value: QuestionDifficulty) => void;
};

const DifficultySelector = ({
  isVisible,
  options,
  selectedDifficulty,
  onSelect,
}: DifficultySelectorProps) => {
  return (
    <section
      className={`rounded-2xl border border-gray bg-white p-5 shadow-sm transition-all duration-700 ease-in-out md:p-8 ${
        isVisible
          ? 'visible translate-y-0 opacity-100'
          : 'pointer-events-none invisible translate-y-10 opacity-0'
      }`}
      aria-hidden={!isVisible}
    >
      <h2 className="mb-4 text-lg font-bold md:text-xl">난이도 설정</h2>
      <ul className="flex w-full rounded-lg bg-gray p-1">
        {options.map((diff) => {
          const isSelected = selectedDifficulty === diff.value;
          return (
            <li key={diff.value} className="flex-1">
              <label
                className={`flex cursor-pointer items-center justify-center rounded-md py-3 text-sm transition-all outline-none focus-within:bg-white active:scale-95 md:py-2 md:active:scale-100 ${
                  isSelected
                    ? 'bg-white font-bold text-black shadow-sm'
                    : 'font-medium text-dark-gray hover:text-black'
                }`}
              >
                <input
                  type="radio"
                  name="difficulty-level"
                  value={diff.value}
                  checked={isSelected}
                  onChange={() => onSelect(diff.value)}
                  className="sr-only"
                />
                {diff.label}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex items-start gap-2 text-xs text-dark-gray md:items-center">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-primary text-[0.625rem] text-primary">
          i
        </span>
        <span>전공자 수준의 심화 질문이 출제됩니다.</span>
      </div>
    </section>
  );
};

export default DifficultySelector;
