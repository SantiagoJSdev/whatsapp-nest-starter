import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const TIMEOUT_MS = 2000;

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  @Get()
  async check(): Promise<{ status: string }> {
    return this.runWithTimeout(async () => {
      // Consulta real a PostgreSQL a través de la conexión de la aplicación.
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    });
  }

  private async runWithTimeout<T>(fn: () => Promise<T>): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('timeout')),
        TIMEOUT_MS,
      ),
    );

    try {
      return await Promise.race([fn(), timeout]);
    } catch (err) {
      throw new HttpException(
        { status: 'error' }, // Sin detalles internos ni credenciales.
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
