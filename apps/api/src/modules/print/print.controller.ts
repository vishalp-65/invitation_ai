import { createPrintOrderSchema, PRINT_ORDER_STATUSES, updatePrintOrderSchema, type CreatePrintOrderInput } from '@cardai/shared';
import { Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { CurrentUser, Public, Roles, type AuthUser } from '../../common/auth.decorators.js';
import { UuidParam, ZBody, ZQuery } from '../../common/zod.js';
import { AdminGuard, AdminScopes } from '../admin/admin-access.js';
import { PrintService } from './print.service.js';
import { RequireFlag } from '../flags/flags.module.js';

@Controller()
export class PrintController {
  constructor(private readonly print: PrintService) {}

  @Public()
  @Get('print/partners')
  partners() {
    return this.print.partners();
  }

  @RequireFlag('print_orders', 'Print orders are paused for a short while.')
  @Post('print/orders')
  create(@CurrentUser() user: AuthUser, @ZBody(createPrintOrderSchema) body: CreatePrintOrderInput) {
    return this.print.create(user, body);
  }

  @Get('print/orders')
  mine(@CurrentUser() user: AuthUser) {
    return this.print.mine(user);
  }

  @Roles('admin')
  @UseGuards(AdminGuard)
  @AdminScopes('support')
  @Get('admin/print-orders')
  adminList(@ZQuery(z.object({ status: z.enum(PRINT_ORDER_STATUSES).optional() })) q: { status?: string }) {
    return this.print.adminList(q.status);
  }

  @Roles('admin')
  @UseGuards(AdminGuard)
  @AdminScopes('support')
  @Patch('admin/print-orders/:id')
  adminUpdate(@UuidParam('id') id: string, @ZBody(updatePrintOrderSchema) body: z.infer<typeof updatePrintOrderSchema>) {
    return this.print.adminUpdate(id, body);
  }
}
