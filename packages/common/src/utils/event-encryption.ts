import * as crypto from 'crypto';

export class EventEncryption {
  private static algorithm = 'aes-256-gcm';
  private static key: Buffer;
  private static hmacSecret: string;

  static initialize(secret: string, hmacSecret?: string): void {
    this.key = crypto.scryptSync(secret, 'salt', 32);
    this.hmacSecret = hmacSecret || secret; // Use same secret if not provided
  }

  static encrypt(data: any): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;

    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('hex'),
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  static decrypt(encrypted: string, iv: string, tag: string): any {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.key,
      Buffer.from(iv, 'hex'),
    ) as crypto.DecipherGCM;

    decipher.setAuthTag(Buffer.from(tag, 'hex'));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'hex')),
      decipher.final(),
    ]);

    return JSON.parse(decrypted.toString('utf8'));
  }

  static sign(data: string): string {
    return crypto.createHmac('sha256', this.hmacSecret).update(data).digest('hex');
  }

  static verify(data: string, signature: string): boolean {
    const expectedSignature = this.sign(data);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  }
}