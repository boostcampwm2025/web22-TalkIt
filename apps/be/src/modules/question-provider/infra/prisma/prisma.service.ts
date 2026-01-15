// 간단 PrismaService 스텁: 실제 구동에는 @prisma/client 설치 및 schema 필요
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

let PrismaClient: any;
try {
  // 동적 import로 빌드 시 의존성 미존재 환경에서도 타입만 유지
  // 실제 실행 환경에서는 @prisma/client가 설치되어 있어야 함
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (_) {
  PrismaClient = class {
    $connect() {
      /* noop */
    }
    $disconnect() {
      /* noop */
    }
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // 연결은 실행 환경에서만 유효
    if (super.$connect) await super.$connect();
  }
  async onModuleDestroy() {
    if (super.$disconnect) await super.$disconnect();
  }
}
