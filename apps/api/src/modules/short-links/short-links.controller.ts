import { BadRequestException, Controller, Get, Header, Param } from '@nestjs/common';
import { Public, RateLimit } from '../../common/auth.decorators.js';
import { ShortLinksService } from './short-links.service.js';

@Public()
@Controller('public/s')
export class ShortLinksController {
  constructor(private readonly links: ShortLinksService) {}

  /** The web app's short-link route asks where a code points, then redirects. */
  @Get(':code')
  @Header('Cache-Control', 'no-store')
  @RateLimit({ limit: 120, windowSec: 60, by: 'ip' })
  resolve(@Param('code') code: string) {
    if (!/^[A-Za-z0-9-]{3,40}$/.test(code)) throw new BadRequestException('Invalid link');
    return this.links.resolve(code);
  }
}
