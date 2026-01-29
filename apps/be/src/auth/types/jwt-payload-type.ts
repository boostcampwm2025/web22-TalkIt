export type JwtPayload = {
  sub: number; // userId
  nickname: string;
  email?: string;
};
