/**
 * Supported regions for content preferences
 * ISO 3166-1 alpha-2 country codes
 */
export interface Region {
  code: string;
  name: string;
}

export const AVAILABLE_REGIONS: Region[] = [
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'United States' },
  { code: 'MX', name: 'México' },
  { code: 'AR', name: 'Argentina' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Perú' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'CU', name: 'Cuba' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'HN', name: 'Honduras' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'PA', name: 'Panamá' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'FR', name: 'Francia' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'DE', name: 'Alemania' },
  { code: 'IT', name: 'Italia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'BR', name: 'Brasil' },
  { code: 'CA', name: 'Canadá' },
  { code: 'AU', name: 'Australia' },
  { code: 'NZ', name: 'Nueva Zelanda' },
].sort((a, b) => a.name.localeCompare(b.name));

