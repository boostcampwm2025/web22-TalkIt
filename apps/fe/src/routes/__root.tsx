import { Link, Outlet, createRootRoute } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

const RootLayout = () => (
  <>
    <div className="flex gap-2 p-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{' '}
      <Link to="/about" className="[&.active]:font-bold">
        About
      </Link>
    </div>
    <hr />
    <Outlet />
    {/* 아래 라인은 프로덕션 레벨에서는 제거하면 될듯합니다 */}
    <TanStackRouterDevtools />
  </>
);

export const Route = createRootRoute({ component: RootLayout });
