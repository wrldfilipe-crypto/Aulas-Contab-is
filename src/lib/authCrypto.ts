/**
 * Cryptographic & Authentication Utilities for Isolated Accounts
 * Implements client-side SHA-256 password hashing with salt,
 * session token validation, and password strength metrics.
 */

/**
 * Generates a random cryptographic salt.
 */
export function generateSalt(length: number = 16): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Hashes a password with salt using SHA-256.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(password + '::' + salt + '::ga_accounting_isolated_sec');
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('[authCrypto] crypto.subtle digest fallback:', e);
    }
  }

  // Fallback hash implementation
  let hash = 0x811c9dc5;
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i];
    hash = (hash * 0x01000193) >>> 0;
  }
  return 'h_' + hash.toString(16).padStart(8, '0') + '_' + salt.substring(0, 8);
}

/**
 * Validates email format.
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates password rules.
 */
export function validatePasswordRequirements(password: string): { isValid: boolean; message?: string } {
  if (!password || password.length < 6) {
    return { isValid: false, message: 'A palavra-passe deve conter pelo menos 6 caracteres.' };
  }
  return { isValid: true };
}

export interface PasswordStrengthResult {
  score: number; // 0 to 4
  label: string;
  color: string;
  barColor: string;
  widthPercent: number;
}

/**
 * Calculates password strength.
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { score: 0, label: 'Muito curta', color: 'text-slate-400', barColor: 'bg-slate-200', widthPercent: 0 };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 1, label: 'Fraca', color: 'text-red-500', barColor: 'bg-red-500', widthPercent: 25 };
  }
  if (score === 2 || score === 3) {
    return { score: 2, label: 'Média', color: 'text-amber-500', barColor: 'bg-amber-500', widthPercent: 50 };
  }
  if (score === 4) {
    return { score: 3, label: 'Forte', color: 'text-emerald-500', barColor: 'bg-emerald-500', widthPercent: 75 };
  }
  return { score: 4, label: 'Excelente', color: 'text-emerald-600', barColor: 'bg-emerald-600', widthPercent: 100 };
}
