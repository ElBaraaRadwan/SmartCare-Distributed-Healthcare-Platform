import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitterService } from '../events/event-emitter.service';
import { RedisService } from '../redis/redis.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { EVENT_TYPES } from '@smartcare/common';

@Injectable()
export class StockService {
  private readonly logger = new Logger(StockService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitterService,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateStockDto) {
    // Check if drug already exists
    const existing = await this.prisma.stock.findUnique({
      where: { drugName: dto.drugName },
    });

    if (existing) {
      throw new ConflictException(`Stock for ${dto.drugName} already exists`);
    }

    const stock = await this.prisma.stock.create({
      data: {
        drugName: dto.drugName,
        quantity: dto.quantity,
        price: dto.price,
        minThreshold: dto.minThreshold || 50,
        description: dto.description,
      },
    });

    // Invalidate stock catalog cache
    await this.redisService.del('pharmacy:stocks:all');
    this.logger.debug('Invalidated stock catalog cache after creation');

    this.logger.log(
      `Stock created: ${stock.drugName} (Qty: ${stock.quantity})`,
    );
    return stock;
  }

  async findAll() {
    const cacheKey = 'pharmacy:stocks:all';

    // Try to get from cache first
    let stocks = await this.redisService.get<any[]>(cacheKey);

    if (!stocks) {
      // Cache miss - fetch from database
      this.logger.debug(
        'Cache miss for stock catalog - fetching from database',
      );
      stocks = await this.prisma.stock.findMany({
        orderBy: {
          drugName: 'asc',
        },
      });

      // Cache the result for 1 hour
      await this.redisService.set(cacheKey, stocks, 3600);
      this.logger.debug(`Cached ${stocks.length} stock items for 1 hour`);
    } else {
      this.logger.debug(`Cache hit - retrieved ${stocks.length} stock items`);
    }

    return stocks;
  }

  async findOne(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
    });

    if (!stock) {
      throw new NotFoundException(`Stock ${id} not found`);
    }

    return stock;
  }

  async findByDrugName(drugName: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { drugName },
    });

    if (!stock) {
      throw new NotFoundException(`Stock for ${drugName} not found`);
    }

    return stock;
  }

  async update(id: string, dto: UpdateStockDto) {
    await this.findOne(id); // Ensure exists

    const stock = await this.prisma.stock.update({
      where: { id },
      data: dto,
    });

    // Invalidate stock catalog cache
    await this.redisService.del('pharmacy:stocks:all');
    this.logger.debug('Invalidated stock catalog cache after update');

    this.logger.log(`Stock updated: ${stock.drugName}`);
    return stock;
  }

  async adjustQuantity(drugName: string, quantityChange: number) {
    const stock = await this.findByDrugName(drugName);

    const newQuantity = stock.quantity + quantityChange;

    if (newQuantity < 0) {
      throw new ConflictException(`Insufficient stock for ${drugName}`);
    }

    const updated = await this.prisma.stock.update({
      where: { drugName },
      data: { quantity: newQuantity },
    });

    // Invalidate stock catalog cache
    await this.redisService.del('pharmacy:stocks:all');
    this.logger.debug(
      'Invalidated stock catalog cache after quantity adjustment',
    );

    // Check for low stock
    if (updated.quantity <= updated.minThreshold) {
      await this.eventEmitter.emit(EVENT_TYPES.LOW_STOCK, {
        drugName: updated.drugName,
        currentQuantity: updated.quantity,
        threshold: updated.minThreshold,
        pharmacyId: 'default-pharmacy-001',
      });

      this.logger.warn(
        `⚠️  Low stock alert: ${updated.drugName} (${updated.quantity} remaining)`,
      );
    }

    return updated;
  }

  async delete(id: string) {
    await this.findOne(id); // Ensure exists

    const deleted = await this.prisma.stock.delete({
      where: { id },
    });

    // Invalidate stock catalog cache
    await this.redisService.del('pharmacy:stocks:all');
    this.logger.debug('Invalidated stock catalog cache after deletion');

    return deleted;
  }

  async getLowStock() {
    return this.prisma.stock.findMany({
      where: {
        quantity: {
          lte: this.prisma.stock.fields.minThreshold,
        },
      },
      orderBy: {
        quantity: 'asc',
      },
    });
  }
}
