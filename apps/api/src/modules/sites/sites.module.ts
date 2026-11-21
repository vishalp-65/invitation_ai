import { Module } from '@nestjs/common';
import { GiftsController } from './gifts.controller.js';
import { GiftsService } from './gifts.service.js';
import { SiteAdminController } from './site-admin.controller.js';
import { SiteAdminService } from './site-admin.service.js';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';

@Module({
  controllers: [SitesController, SiteAdminController, GiftsController],
  providers: [SitesService, SiteAdminService, GiftsService],
})
export class SitesModule {}
