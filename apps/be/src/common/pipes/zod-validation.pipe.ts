import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      const firstErrorMessage = result.error.issues[0]?.message ?? 'Validation failed';

      throw new BadRequestException(firstErrorMessage);
    }

    return result.data;
  }
}
