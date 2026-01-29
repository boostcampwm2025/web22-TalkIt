import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { JwtPayload } from '../types/jwt-payload-type';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      // 쿠키에서 토큰 추출하는 커스텀 로직
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refreshToken;
        },
      ]),

      // 만료되었는지 확인
      ignoreExpiration: false,

      // 리프레시 토큰 전용 시크릿 키 사용
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),

      // validate 메서드에서 request 객체를 쓰기 위해 true로 설정
      passReqToCallback: true,
    });
  }

  // 검증 성공 시 실행
  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    return {
      id: payload.sub,
      nickname: payload.nickname,
      email: payload.email,
      refreshToken,
    };
  }
}
