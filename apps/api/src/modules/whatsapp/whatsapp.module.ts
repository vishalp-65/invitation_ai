import { Global, Module } from '@nestjs/common';
import { GuestsModule } from '../guests/guests.module.js';
import { BotService } from './bot.service.js';
import { NotificationsProcessor } from './notifications.processor.js';
import { WhatsAppClient } from './whatsapp.client.js';
import { WhatsAppController } from './whatsapp.controller.js';

@Global()
@Module({
  imports: [GuestsModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppClient, BotService, NotificationsProcessor],
  exports: [WhatsAppClient],
})
export class WhatsAppModule {}
