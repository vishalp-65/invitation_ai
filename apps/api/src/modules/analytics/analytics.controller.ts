import { trackBatchSchema, type TrackBatchInput } from '@cardai/shared';
import { Controller, HttpCode, Post, Req } from '@nestjs/common';
import { Public, RateLimit, type AuthedRequest } from '../../common/auth.decorators.js';
import { ZBody } from '../../common/zod.js';
import { AnalyticsService, parseGeo } from './analytics.service.js';

@Controller('track')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Public()
  @Post()
  @HttpCode(204)
  @RateLimit({ limit: 240, windowSec: 600, by: 'ip' })
  async track(@ZBody(trackBatchSchema) body: TrackBatchInput, @Req() req: AuthedRequest) {
    const cookies = (req.cookies ?? {}) as Record<string, string | undefined>;
    await this.analytics.ingest(body, { userId: req.user?.id, userAgent: req.headers['user-agent'], geo: parseGeo(cookies.cai_geo), refEventId: cookies.cai_ref ?? null });
  }
}
