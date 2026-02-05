import type { QUESTION_CATEGORY_CONFIG } from '@/constants/question';
import type { QuestionCategory } from '@repo/shared/constants/learning';

import { ListFilter } from 'lucide-react';

type TopicSelectorProps = {
  options: (typeof QUESTION_CATEGORY_CONFIG)[keyof typeof QUESTION_CATEGORY_CONFIG][];
  selectedTopic: QuestionCategory | null;
  onSelect: (id: QuestionCategory) => void;
};

const TopicSelector = ({ options, selectedTopic, onSelect }: TopicSelectorProps) => {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2 md:mb-6">
        <ListFilter className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-bold md:text-xl">학습 주제 선택 (Learning Path)</h2>
      </div>

      <ul className="scrollbar-hide flex gap-4 overflow-x-auto pb-4 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible lg:grid-cols-4">
        {options.map((topic) => {
          const isSelected = selectedTopic === topic.id;
          return (
            <li key={topic.id} className="min-w-55 md:min-w-0">
              <label
                className={`group block h-full cursor-pointer rounded-xl border-2 p-4 transition-all outline-none focus-within:bg-white active:scale-95 md:active:scale-100 ${
                  isSelected
                    ? 'border-primary bg-white shadow-md'
                    : 'border-transparent bg-transparent hover:border-gray hover:bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="learning-topic"
                  value={topic.id}
                  checked={isSelected}
                  onChange={() => onSelect(topic.id)}
                  className="sr-only"
                />
                <div
                  className={`mb-3 transition-colors group-hover:text-primary ${isSelected ? 'text-primary' : 'text-black'}`}
                >
                  <topic.Icon className="h-6 w-6" />
                </div>
                <p className="mb-1 text-lg font-bold">{topic.label}</p>
                <p className="text-xs text-dark-gray">{topic.description}</p>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default TopicSelector;
