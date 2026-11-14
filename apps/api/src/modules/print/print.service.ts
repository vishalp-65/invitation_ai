import { and, desc, eq, printOrders, printPartners, renders, type Database } from '@cardai/db';
import type { CreatePrintOrderInput } from '@cardai/shared';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { z } from 'zod';
import type { updatePrintOrderSchema } from '@cardai/shared';
import type { AuthUser } from '../../common/auth.decorators.js';
import { DB } from '../../infra/infra.module.js';
import { EntitlementsService } from '../entitlements/entitlements.service.js';
import { EventsService } from '../events/events.service.js';

/** Digital → physical bridge: print-ready PDF + request a quote from a partner press. */
@Injectable()
export class PrintService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly events: EventsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async partners() {
    const rows = await this.db.select().from(printPartners).where(eq(printPartners.active, true));
    return { items: rows.map(({ phone: _phone, ...p }) => p) };
  }

  async create(user: AuthUser, input: CreatePrintOrderInput) {
    await this.events.getOwned(user, input.eventId);
    await this.entitlements.require(input.eventId, 'print_pdf', 'Printing needs the print-ready PDF');
    const [render] = await this.db
      .select({ id: renders.id })
      .from(renders)
      .where(and(eq(renders.eventId, input.eventId), eq(renders.format, 'print_pdf'), eq(renders.status, 'completed')))
      .orderBy(desc(renders.createdAt))
      .limit(1);
    if (!render) throw new BadRequestException('Generate the print-ready PDF first');

    const [order] = await this.db
      .insert(printOrders)
      .values({
        userId: user.id,
        eventId: input.eventId,
        partnerId: input.partnerId,
        renderId: render.id,
        quantity: input.quantity,
        paperType: input.paperType,
        shippingAddress: input.shippingAddress,
        notes: input.notes,
      })
      .returning();
    return order;
  }

  mine(user: AuthUser) {
    return this.db.select().from(printOrders).where(eq(printOrders.userId, user.id)).orderBy(desc(printOrders.createdAt));
  }

  adminList(status?: string) {
    const q = this.db.select().from(printOrders);
    return (status ? q.where(eq(printOrders.status, status as never)) : q).orderBy(desc(printOrders.createdAt)).limit(200);
  }

  async adminUpdate(id: string, input: z.infer<typeof updatePrintOrderSchema>) {
    const [row] = await this.db.update(printOrders).set(input).where(eq(printOrders.id, id)).returning();
    if (!row) throw new NotFoundException('Print order not found');
    return row;
  }
}
