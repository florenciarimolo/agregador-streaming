/**
 * Password validation utility
 * Validates password strength according to policy:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecialChar: boolean;
  };
}

/**
 * Validate password against policy
 */
export function validatePassword(password: string): PasswordValidationResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
  };

  const errors: string[] = [];

  if (!checks.minLength) {
    errors.push('La contraseña debe tener al menos 8 caracteres');
  }
  if (!checks.hasUppercase) {
    errors.push('La contraseña debe contener al menos una letra mayúscula');
  }
  if (!checks.hasLowercase) {
    errors.push('La contraseña debe contener al menos una letra minúscula');
  }
  if (!checks.hasNumber) {
    errors.push('La contraseña debe contener al menos un número');
  }
  if (!checks.hasSpecialChar) {
    errors.push('La contraseña debe contener al menos un símbolo');
  }

  return {
    isValid: errors.length === 0,
    errors,
    checks,
  };
}

/**
 * Get password helper text in Spanish
 */
export function getPasswordHelperText(): string {
  return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un símbolo.';
}
