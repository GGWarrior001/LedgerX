/**
 * passwordValidator – OWASP-compliant password validation and strength calculation.
 *
 * Enforces industry-standard password requirements:
 * - Minimum 12 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one symbol (!@#$%^&*)
 *
 * Provides real-time strength calculation for UI feedback.
 */

/**
 * Password validation result with detailed feedback.
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  strength: PasswordStrength;
}

/**
 * Password strength levels based on OWASP guidelines.
 */
export type PasswordStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Individual requirement check result.
 */
export interface RequirementCheck {
  name: 'length' | 'uppercase' | 'lowercase' | 'number' | 'symbol';
  label: string;
  met: boolean;
}

// OWASP Password Requirements
const MIN_LENGTH = 12;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SYMBOL_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/;

/**
 * Validates a password against OWASP requirements.
 * Returns validation result with specific error messages for each failed requirement.
 *
 * @param password The password to validate
 * @returns ValidationResult with valid flag, errors array, and strength level
 */
export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];

  // Check length
  if (password.length < MIN_LENGTH) {
    errors.push(`Password must be at least ${MIN_LENGTH} characters (currently ${password.length})`);
  }

  // Check uppercase
  if (!UPPERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one uppercase letter (A-Z)');
  }

  // Check lowercase
  if (!LOWERCASE_REGEX.test(password)) {
    errors.push('Password must contain at least one lowercase letter (a-z)');
  }

  // Check number
  if (!NUMBER_REGEX.test(password)) {
    errors.push('Password must contain at least one digit (0-9)');
  }

  // Check symbol
  if (!SYMBOL_REGEX.test(password)) {
    errors.push('Password must contain at least one symbol (!@#$%^&*)');
  }

  const valid = errors.length === 0;
  const strength = calculateStrength(password);

  return { valid, errors, strength };
}

/**
 * Checks individual password requirements and returns their status.
 * Used by UI components to show real-time requirement feedback.
 *
 * @param password The password to check
 * @returns Array of RequirementCheck objects showing met status for each requirement
 */
export function checkRequirements(password: string): RequirementCheck[] {
  return [
    {
      name: 'length',
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      name: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      met: UPPERCASE_REGEX.test(password),
    },
    {
      name: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      met: LOWERCASE_REGEX.test(password),
    },
    {
      name: 'number',
      label: 'At least one digit (0-9)',
      met: NUMBER_REGEX.test(password),
    },
    {
      name: 'symbol',
      label: 'At least one symbol (!@#$%^&*)',
      met: SYMBOL_REGEX.test(password),
    },
  ];
}

/**
 * Calculates password strength based on OWASP guidelines.
 * Returns a strength level (weak → fair → good → strong) for real-time UI feedback.
 *
 * Strength algorithm:
 * - Weak: Fails any OWASP requirement
 * - Fair: Meets all requirements, length 12-15
 * - Good: Meets all requirements, length 16-19 OR has extra complexity (repeated chars, patterns)
 * - Strong: Meets all requirements, length 20+ OR has high entropy
 *
 * @param password The password to analyze
 * @returns PasswordStrength level
 */
export function calculateStrength(password: string): PasswordStrength {
  const result = validatePassword(password);

  // Weak: fails any requirement
  if (!result.valid) {
    return 'weak';
  }

  const length = password.length;

  // Strong: 20+ characters (very safe)
  if (length >= 20) {
    return 'strong';
  }

  // Strong: 16+ chars + has symbol + has number + mixed case (good entropy)
  if (length >= 16 && hasHighEntropy(password)) {
    return 'strong';
  }

  // Good: 16+ characters (solid length)
  if (length >= 16) {
    return 'good';
  }

  // Good: 12+ with extra complexity signals
  if (length >= 12 && hasComplexitySignals(password)) {
    return 'good';
  }

  // Fair: meets all requirements but 12-15 chars (minimal)
  return 'fair';
}

/**
 * Checks if password has high entropy indicators.
 * Detects diverse character mixing and lack of common patterns.
 *
 * @param password The password to check
 * @returns True if password shows high entropy characteristics
 */
function hasHighEntropy(password: string): boolean {
  // Count unique characters
  const uniqueChars = new Set(password).size;
  if (uniqueChars < password.length * 0.6) {
    return false; // Low diversity (many repeated chars)
  }

  // Check for no common patterns (123, abc, etc)
  const hasSequence = /012|123|234|345|456|567|678|789|abc|bcd|cde|def/.test(
    password.toLowerCase()
  );
  return !hasSequence;
}

/**
 * Checks if password has complexity signals beyond minimum requirements.
 * Looks for indicators of deliberate strength (mixed caps, numbers spread throughout, etc).
 *
 * @param password The password to check
 * @returns True if password shows complexity signals
 */
function hasComplexitySignals(password: string): boolean {
  // Check for balanced distribution of character types
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password);

  // Count character type groups (max 4)
  const typeCount = [hasUppercase, hasLowercase, hasNumbers, hasSymbols].filter(Boolean)
    .length;

  // All 4 types = complexity signal
  if (typeCount === 4) {
    return true;
  }

  // Check position diversity: symbols/numbers spread throughout (not just at start/end)
  const middleRange = password.slice(1, -1);
  const hasNumbersInMiddle = /[0-9]/.test(middleRange);
  const hasSymbolsInMiddle = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(middleRange);

  return hasNumbersInMiddle && hasSymbolsInMiddle;
}

/**
 * Quick check: is password strong enough to proceed?
 * Used for form submission validation.
 *
 * @param password The password to check
 * @returns True if password passes OWASP requirements
 */
export function isStrongPassword(password: string): boolean {
  return validatePassword(password).valid;
}
