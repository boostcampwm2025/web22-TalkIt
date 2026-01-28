import { createFileRoute } from '@tanstack/react-router';

const Index = () => {
  return (
    <div className="p-2">
      <h3>Welcome Home!</h3>
    </div>
  );
};

export const Route = createFileRoute('/_public/')({
  component: Index,
});
