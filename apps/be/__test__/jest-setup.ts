// test/jest-setup.ts
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

import { z } from 'zod';

// 모든 테스트가 실행되기 전에 Zod에 OpenAPI 기능을 확장합니다.
extendZodWithOpenApi(z);
