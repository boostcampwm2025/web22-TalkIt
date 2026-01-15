import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { ZodType } from 'zod';

export function zodSchemaToOpenAPI(schema: ZodType): SchemaObject {
  const registry = new OpenAPIRegistry();
  registry.register('Schema', schema);

  const generator = new OpenApiGeneratorV3(registry.definitions);
  const components = generator.generateComponents();

  return (components.components?.schemas?.Schema as SchemaObject) ?? {};
}
