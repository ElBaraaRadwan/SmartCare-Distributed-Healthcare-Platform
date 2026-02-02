import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { StockService } from '../stock/stock.service';
import { ConfirmOrderDto } from './dto/confirm-order.dto';
import { EVENT_TYPES, IAuthenticatedUser } from '@smartcare/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitterService,
    private stockService: StockService,
  ) {}

  async createFromPrescription(prescriptionData: any) {
    const { prescriptionId, medications } = prescriptionData;

    // Check if order already exists for this prescription
    const existing = await this.prisma.order.findUnique({
      where: { prescriptionId },
    });

    if (existing) {
      this.logger.warn(
        `Order already exists for prescription ${prescriptionId}`,
      );
      return existing;
    }

    // Calculate total and check stock availability
    let total = 0;
    const orderItems: Array<{
      drugName: string;
      quantity: number;
      price: number;
    }> = [];

    for (const med of medications) {
      try {
        const stock = await this.stockService.findByDrugName(med.name);

        if (stock.quantity < med.quantity) {
          this.logger.warn(
            `Insufficient stock for ${med.name}: need ${med.quantity}, have ${stock.quantity}`,
          );
        }

        orderItems.push({
          drugName: med.name,
          quantity: med.quantity,
          price: stock.price,
        });

        total += stock.price * med.quantity;
      } catch (error) {
        this.logger.error(`Stock not found for medication: ${med.name}`);
        // Continue with other medications, add with default price
        orderItems.push({
          drugName: med.name,
          quantity: med.quantity,
          price: 10.0, // Default price
        });
        total += 10.0 * med.quantity;
      }
    }

    // Create order
    const order = await this.prisma.order.create({
      data: {
        prescriptionId,
        pharmacyId: 'default-pharmacy-001',
        status: 'PENDING' as const,
        total,
        medications: {
          create: orderItems as any, // Type assertion for Prisma create
        },
      },
      include: {
        medications: true,
      },
    });

    // Emit ORDER_CREATED event
    await this.eventEmitter.emit(EVENT_TYPES.ORDER_CREATED, {
      orderId: order.id,
      prescriptionId: order.prescriptionId,
      pharmacyId: order.pharmacyId,
      total: order.total,
      medications: order.medications.map((m) => ({
        drugName: m.drugName,
        quantity: m.quantity,
        price: m.price,
      })),
    });

    this.logger.log(`Order created: ${order.id} (Total: $${order.total})`);

    return order;
  }

  async findAll(filters?: { pharmacyId?: string; status?: string }) {
    const orders = await this.prisma.order.findMany({
      where: {
        ...(filters?.pharmacyId && { pharmacyId: filters.pharmacyId }),
        ...(filters?.status && { status: filters.status as any }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get medications for each order with pricing from stocks
    const ordersWithMedications = await Promise.all(
      orders.map(async (order) => {
        const medications = await this.prisma.medication.findMany({
          where: { prescriptionId: order.prescriptionId },
        });

        // Get prices from stocks table
        const medicationsWithPrices = await Promise.all(
          medications.map(async (med) => {
            const stock = await this.prisma.stock.findUnique({
              where: { drugName: med.name },
            });

            return {
              ...med,
              price: stock?.price || 0,
            };
          }),
        );

        return {
          ...order,
          medications: medicationsWithPrices,
        };
      }),
    );

    return ordersWithMedications;
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order ${id} not found`);
    }

    // Get medications with pricing
    const medications = await this.prisma.medication.findMany({
      where: { prescriptionId: order.prescriptionId },
    });

    const medicationsWithPrices = await Promise.all(
      medications.map(async (med) => {
        const stock = await this.prisma.stock.findUnique({
          where: { drugName: med.name },
        });

        return {
          ...med,
          price: stock?.price || 0,
        };
      }),
    );

    return {
      ...order,
      medications: medicationsWithPrices,
    };
  }

  async findByPrescriptionId(prescriptionId: string) {
    const order = await this.prisma.order.findUnique({
      where: { prescriptionId },
      include: {
        medications: true,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order for prescription ${prescriptionId} not found`,
      );
    }

    return order;
  }

  async confirm(id: string, dto: ConfirmOrderDto, user: IAuthenticatedUser) {
    const order = await this.findOne(id);

    if (order.status !== 'PENDING') {
      throw new ConflictException(`Order ${id} is not in PENDING status`);
    }

    // Deduct from stock
    for (const item of order.medications) {
      try {
        await this.stockService.adjustQuantity(
          (item as any).name,
          -item.quantity,
        );
        this.logger.log(
          `Stock adjusted: ${(item as any).name} (-${item.quantity})`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to adjust stock for ${(item as any).name}:`,
          error.message,
        );
      }
    }

    // Update order status
    const confirmed = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        estimatedDelivery: dto.estimatedDelivery
          ? new Date(dto.estimatedDelivery)
          : null,
      },
      include: {
        medications: true,
      },
    });

    // Emit ORDER_CONFIRMED event
    await this.eventEmitter.emit(EVENT_TYPES.ORDER_CONFIRMED, {
      orderId: confirmed.id,
      prescriptionId: confirmed.prescriptionId,
      pharmacyId: confirmed.pharmacyId,
      estimatedDelivery: confirmed.estimatedDelivery,
      total: confirmed.total,
    });

    this.logger.log(`Order confirmed: ${confirmed.id} by ${user.email}`);

    return confirmed;
  }

  async cancel(id: string, user: IAuthenticatedUser) {
    const order = await this.findOne(id);

    if (order.status === 'DELIVERED' || order.status === 'SHIPPED') {
      throw new ConflictException(
        `Cannot cancel order in ${order.status} status`,
      );
    }

    // If order was confirmed, restore stock
    if (order.status === 'CONFIRMED') {
      for (const item of order.medications) {
        try {
          await this.stockService.adjustQuantity(
            (item as any).name,
            item.quantity,
          );
          this.logger.log(
            `Stock restored: ${(item as any).name} (+${item.quantity})`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to restore stock for ${(item as any).name}:`,
            error.message,
          );
        }
      }
    }

    const cancelled = await this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        medications: true,
      },
    });

    this.logger.log(`Order cancelled: ${cancelled.id} by ${user.email}`);

    return cancelled;
  }
}
