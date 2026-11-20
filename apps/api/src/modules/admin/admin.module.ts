import { Module } from '@nestjs/common';
import { OpsModule } from '../ops/ops.module.js';
import { AdminAccessModule } from './admin-access.js';
import { AdminAnalyticsService } from './admin-analytics.service.js';
import { AdminController } from './admin.controller.js';
import { AdminInsightsService } from './admin-insights.service.js';
import { AdminService } from './admin.service.js';
import { AdminSystemService } from './admin-system.service.js';

@Module({
  imports: [AdminAccessModule, OpsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAnalyticsService, AdminInsightsService, AdminSystemService],
})
export class AdminModule {}
