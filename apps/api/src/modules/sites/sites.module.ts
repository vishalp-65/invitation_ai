import { Module } from '@nestjs/common';
import { SiteAdminController } from './site-admin.controller.js';
import { SiteAdminService } from './site-admin.service.js';
import { SitesController } from './sites.controller.js';
import { SitesService } from './sites.service.js';

@Module({
  controllers: [SitesController, SiteAdminController],
  providers: [SitesService, SiteAdminService],
})
export class SitesModule {}
