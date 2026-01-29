import { createFileRoute } from '@tanstack/react-router';

const LoginPage = () => {
  return <div>login</div>;
};

export const Route = createFileRoute('/_public/login')({
  component: LoginPage,
});
