import { COMMUNITIES, EVENT_TYPE_IDS } from '@cardai/shared';
import { Controller, Get, Param } from '@nestjs/common';
import { z } from 'zod';
import { Public } from '../../common/auth.decorators.js';
import { ZQuery } from '../../common/zod.js';
import { TemplatesService } from './templates.service.js';

const listQuery = z.object({
  eventType: z.enum(EVENT_TYPE_IDS).optional(),
  community: z.enum(COMMUNITIES).optional(),
  q: z.string().max(40).optional(),
  premium: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
});

@Public()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  async list(@ZQuery(listQuery) query: z.infer<typeof listQuery>) {
    return { items: await this.templates.list(query) };
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.templates.resolve(id);
  }
}
