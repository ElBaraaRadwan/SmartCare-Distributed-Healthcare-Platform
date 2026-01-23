export interface ApiGatewayConfig {
  port: number;
  allowedOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  serviceUrls: {
    auth: string;
    clinic: string;
    prescription: string;
    pharmacy: string;
    payments: string;
    notification: string;
    ocr: string;
  };
}
