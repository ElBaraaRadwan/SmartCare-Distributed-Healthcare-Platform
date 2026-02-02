import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!secretKey || secretKey.includes('PLACEHOLDER')) {
      this.logger.warn(
        '⚠️  Stripe secret key not configured. Using test mode with mock data.',
      );
      // Initialize with a dummy key for development
      this.stripe = new Stripe('sk_test_dummy_key_for_development', {
        apiVersion: '2025-12-15.clover',
      });
    } else {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover',
      });
      this.logger.log('✓ Stripe initialized with production/test key');
    }
  }

  async createCheckoutSession(params: {
    orderId: string;
    amount: number;
    currency: string;
    customerEmail?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<Stripe.Checkout.Session> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency,
              product_data: {
                name: `Order ${params.orderId}`,
                description: 'SmartCare Prescription Order',
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          orderId: params.orderId,
        },
      });

      this.logger.log(`Checkout session created: ${session.id}`);
      return session;
    } catch (error) {
      this.logger.error('Failed to create checkout session:', error);
      throw error;
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return this.stripe.checkout.sessions.retrieve(sessionId);
  }

  async constructWebhookEvent(
    payload: Buffer,
    signature: string,
  ): Promise<Stripe.Event> {
    const webhookSecret = this.configService.get<string>(
      'STRIPE_WEBHOOK_SECRET',
    );

    if (!webhookSecret || webhookSecret.includes('PLACEHOLDER')) {
      this.logger.warn(
        'Webhook secret not configured. Skipping signature verification.',
      );
      // For development, parse without verification
      return JSON.parse(payload.toString());
    }

    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw error;
    }
  }

  getStripeInstance(): Stripe {
    return this.stripe;
  }
}
