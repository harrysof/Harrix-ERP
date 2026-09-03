import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SalesService, type OrderFilters } from './sales.service.js';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto.js';
import {
  CreateOrderDto,
  RecordPaymentDto,
  ReturnOrderDto,
  SetOrderStatusDto,
  ShipOrderDto,
  UpdateOrderDto,
} from './dto/order.dto.js';
import { RequirePermissions } from '../auth/require-permission.decorator.js';
import { PERMISSIONS } from '../auth/permissions.js';

@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // --------------------------------------------------------------- customers

  @Get('customers')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  listCustomers(@Query('includeArchived') includeArchived?: string) {
    return this.sales.listCustomers(includeArchived === 'true');
  }

  @Post('customers')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  createCustomer(@Body() dto: CreateCustomerDto) {
    return this.sales.createCustomer(dto);
  }

  /** §19: profile, order history, and the three summaries, in one call. */
  @Get('customers/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  getCustomer(@Param('id') id: string) {
    return this.sales.getCustomer(id);
  }

  @Patch('customers/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.sales.updateCustomer(id, dto);
  }

  @Patch('customers/:id/archive')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  archiveCustomer(@Param('id') id: string) {
    return this.sales.setCustomerArchived(id, true);
  }

  @Patch('customers/:id/unarchive')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  unarchiveCustomer(@Param('id') id: string) {
    return this.sales.setCustomerArchived(id, false);
  }

  /** Only for a customer with no orders; anything else must be archived. */
  @Delete('customers/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  removeCustomer(@Param('id') id: string) {
    return this.sales.removeCustomer(id);
  }

  // ------------------------------------------------------------------ orders

  @Get('orders/summary')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  summary(@Query() filters: OrderFilters) {
    return this.sales.getSummary(filters);
  }

  @Get('orders')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  listOrders(@Query() filters: OrderFilters) {
    return this.sales.listOrders(filters);
  }

  @Post('orders')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  createOrder(@Body() dto: CreateOrderDto) {
    return this.sales.createOrder(dto);
  }

  @Get('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_READ)
  getOrder(@Param('id') id: string) {
    return this.sales.getOrder(id);
  }

  @Patch('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  updateOrder(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    return this.sales.updateOrder(id, dto);
  }

  @Patch('orders/:id/status')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  setStatus(@Param('id') id: string, @Body() dto: SetOrderStatusDto) {
    return this.sales.setOrderStatus(id, dto);
  }

  /** The only sales action that moves stock. */
  @Post('orders/:id/ship')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  shipOrder(@Param('id') id: string, @Body() dto: ShipOrderDto) {
    return this.sales.shipOrder(id, dto);
  }

  /** Adds to amountPaid — "half now, the rest later" — and re-derives paymentStatus. */
  @Post('orders/:id/payments')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  recordPayment(@Param('id') id: string, @Body() dto: RecordPaymentDto) {
    return this.sales.recordPayment(id, dto);
  }

  /** Restores stock for a shipped order — the mirror of ship(). */
  @Post('orders/:id/return')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  returnOrder(@Param('id') id: string, @Body() dto: ReturnOrderDto) {
    return this.sales.returnOrder(id, dto);
  }

  @Patch('orders/:id/archive')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  archiveOrder(@Param('id') id: string) {
    return this.sales.setOrderArchived(id, true);
  }

  @Patch('orders/:id/unarchive')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  unarchiveOrder(@Param('id') id: string) {
    return this.sales.setOrderArchived(id, false);
  }

  @Delete('orders/:id')
  @RequirePermissions(PERMISSIONS.ORDERS_WRITE)
  removeOrder(@Param('id') id: string) {
    return this.sales.removeOrder(id);
  }
}
