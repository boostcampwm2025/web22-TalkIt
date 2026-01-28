import { AudioWaveform } from 'lucide-react';

type AuthHeaderProps = {
  title: string;
  description: string;
};

export const AuthHeader = ({ title, description }: AuthHeaderProps) => {
  return (
    <div className="mb-8 text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <AudioWaveform size={24} />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-black">{title}</h1>
      <p className="mt-2 text-sm text-dark-gray">{description}</p>
    </div>
  );
};
