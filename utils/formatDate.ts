export function formatDateToSpanish(dateString: string | null | undefined): string {
    if (!dateString) return 'No disponible';
    const parts = dateString.split('-');
    if (parts.length !== 3) return dateString; // fallback por si el formato no es válido
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }