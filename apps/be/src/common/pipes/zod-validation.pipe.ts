import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe<T = unknown> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      // zod의 flatten()을 사용하여 에러를 필드별로 그룹화
      const { fieldErrors } = result.error.flatten();

      throw new BadRequestException({
        message: '유효성 검사에 실패했습니다.',
        errors: fieldErrors,
      });
    }

    return result.data;
  }
}
