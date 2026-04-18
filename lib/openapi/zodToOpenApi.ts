import { z, ZodFirstPartyTypeKind, type ZodTypeAny } from 'zod'

type OpenApiSchema = Record<string, unknown>

function unwrapSchema(schema: ZodTypeAny): ZodTypeAny {
  let current = schema
  while (
    current._def.typeName === ZodFirstPartyTypeKind.ZodOptional ||
    current._def.typeName === ZodFirstPartyTypeKind.ZodDefault ||
    current._def.typeName === ZodFirstPartyTypeKind.ZodNullable
  ) {
    current = (current as any)._def.innerType
  }
  return current
}

export function zodToOpenApiSchema(schema: ZodTypeAny): OpenApiSchema {
  const unwrapped = unwrapSchema(schema)
  const typeName = unwrapped._def.typeName

  switch (typeName) {
    case ZodFirstPartyTypeKind.ZodString:
      return { type: 'string' }
    case ZodFirstPartyTypeKind.ZodNumber:
      return { type: 'number' }
    case ZodFirstPartyTypeKind.ZodBoolean:
      return { type: 'boolean' }
    case ZodFirstPartyTypeKind.ZodAny:
    case ZodFirstPartyTypeKind.ZodUnknown:
      return {}
    case ZodFirstPartyTypeKind.ZodEnum:
      return { type: 'string', enum: (unwrapped as z.ZodEnum<[string, ...string[]]>)._def.values }
    case ZodFirstPartyTypeKind.ZodNativeEnum:
      return {
        type: 'string',
        enum: Object.values((unwrapped as z.ZodNativeEnum<Record<string, string>>)._def.values),
      }
    case ZodFirstPartyTypeKind.ZodArray:
      return {
        type: 'array',
        items: zodToOpenApiSchema((unwrapped as z.ZodArray<ZodTypeAny>)._def.type),
      }
    case ZodFirstPartyTypeKind.ZodRecord:
      return {
        type: 'object',
        additionalProperties: zodToOpenApiSchema((unwrapped as z.ZodRecord<ZodTypeAny>)._def.valueType),
      }
    case ZodFirstPartyTypeKind.ZodObject: {
      const objectSchema = unwrapped as z.AnyZodObject
      const shape = objectSchema.shape as Record<string, ZodTypeAny>
      const properties: Record<string, unknown> = {}
      const required: string[] = []

      for (const [key, value] of Object.entries(shape)) {
        properties[key] = zodToOpenApiSchema(value)
        if (!value.isOptional()) required.push(key)
      }

      return {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      }
    }
    default:
      return {}
  }
}
