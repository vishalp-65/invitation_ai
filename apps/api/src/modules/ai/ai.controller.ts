import {
  generateClipSchema,
  generateImageSchema,
  generateWordingSchema,
  translateContentSchema,
  transliterateSchema,
  type GenerateClipInput,
  type GenerateImageInput,
  type GenerateWordingInput,
  type TransliterateInput,
} from '@cardai/shared';
import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import type { z } from 'zod';
import { CurrentUser, RateLimit, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody } from '../../common/zod.js';
import { AiService } from './ai.service.js';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('wording')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 60 })
  wording(@CurrentUser() user: AuthUser, @ZBody(generateWordingSchema) body: GenerateWordingInput) {
    return this.ai.generateWording(user, body);
  }

  @Post('transliterate')
  @HttpCode(200)
  @RateLimit({ limit: 60, windowSec: 60 })
  transliterate(@CurrentUser() user: AuthUser, @ZBody(transliterateSchema) body: TransliterateInput) {
    return this.ai.transliterate(user, body);
  }

  @Post('translate')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 60 })
  translate(@CurrentUser() user: AuthUser, @ZBody(translateContentSchema) body: z.infer<typeof translateContentSchema>) {
    return this.ai.translateEvent(user, body.eventId, body.targetLanguage);
  }

  @Post('images')
  @RateLimit({ limit: 6, windowSec: 60 })
  image(@CurrentUser() user: AuthUser, @ZBody(generateImageSchema) body: GenerateImageInput) {
    return this.ai.generateImage(user, body);
  }

  @Get('quota/:id')
  quota(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.ai.imageQuota(user, id);
  }

  @Post('clips')
  @RateLimit({ limit: 3, windowSec: 300 })
  clip(@CurrentUser() user: AuthUser, @ZBody(generateClipSchema) body: GenerateClipInput) {
    return this.ai.requestClip(user, body);
  }

  @Get('generations/:id')
  generation(@CurrentUser() user: AuthUser, @UuidParam('id') id: string) {
    return this.ai.getGeneration(user, id);
  }
}
