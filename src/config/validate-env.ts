import { validateSync } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { IsUrl, IsOptional, IsInt, Min } from 'class-validator';

class EnvironmentVariables {
  @IsUrl({
    protocols: ['postgres', 'postgresql'],
    require_tld: false,
    require_protocol: true,
  })
  DATABASE_URL!: string;

  @IsOptional()
  PORT?: string;
}

/**
 * Valida las variables de entorno al arrancar la aplicación.
 * Si DATABASE_URL falta o no es una URL PostgreSQL válida, lanza un error
 * genérico que nunca expone el valor de la variable.
 */
export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validated, {
    skipMissingProperties: false,
    whitelist: true,
    forbidNonWhitelisted: false,
  });

  if (errors.length > 0) {
    const fields = errors.map((e) => e.property).join(', ');
    throw new Error(
      `Configuración de entorno inválida. Revisa la variable: ${fields}.`,
    );
  }

  return validated;
}
