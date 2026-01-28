import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export type ActiveUser = {
  id: number;
  nickname: string;
  email?: string;
};

// JwtAuthGuard 검증 후 request 객체의 유저 정보를 컨트롤러에서 바로 쓸 수 있도록 꺼내주는 역할의 데코레이터 생성
export const ActiveUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ActiveUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
