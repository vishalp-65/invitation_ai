import { BadRequestException, Body, Param, ParseUUIDPipe, Query, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** Validates and transforms input with a shared Zod schema (same schema the web app uses). */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues[0]?.message ?? 'Invalid input',
        details: result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
    }
    return result.data;
  }
}

export const ZBody = <T extends z.ZodType>(schema: T) => Body(new ZodValidationPipe(schema));
export const ZQuery = <T extends z.ZodType>(schema: T) => Query(new ZodValidationPipe(schema));
export const UuidParam = (name: string) => Param(name, new ParseUUIDPipe({ version: '4' }));
