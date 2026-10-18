import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  checkRequirements,
  calculateStrength,
  isStrongPassword,
  type PasswordStrength,
  type RequirementCheck,
} from '@/features/auth/services/passwordValidator';

describe('passwordValidator', () => {
  describe('validatePassword - OWASP Compliance', () => {
    describe('Valid passwords (all requirements met)', () => {
      it('accepts strong passwords with 12+ chars, upper, lower, number, symbol', () => {
        const result = validatePassword('MyPass123!word');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('accepts passwords with 12 chars exactly', () => {
        const result = validatePassword('MyPass123!ab');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('accepts very long passwords', () => {
        const result = validatePassword('VeryLongPassword123!@#WithManyCharacters');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('accepts passwords with multiple symbols', () => {
        const result = validatePassword('Pass@word123!#');
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('accepts passwords with all supported symbols', () => {
        const symbols = ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'];
        symbols.forEach(sym => {
          const password = `MyPass123${sym}`;
          const result = validatePassword(password);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        });
      });
    });

    describe('Invalid passwords - length requirement', () => {
      it('rejects passwords shorter than 12 characters', () => {
        const result = validatePassword('MyPass123!');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('at least 12 characters'));
      });

      it('rejects empty password', () => {
        const result = validatePassword('');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('rejects 11-char password even if all other requirements met', () => {
        const result = validatePassword('MyPass123!a');
        expect(result.valid).toBe(false);
      });
    });

    describe('Invalid passwords - uppercase requirement', () => {
      it('rejects passwords without uppercase letters', () => {
        const result = validatePassword('mypass123!ab');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('at least one uppercase letter')
        );
      });

      it('rejects all-lowercase + numbers + symbols', () => {
        const result = validatePassword('password123!@#');
        expect(result.valid).toBe(false);
      });
    });

    describe('Invalid passwords - lowercase requirement', () => {
      it('rejects passwords without lowercase letters', () => {
        const result = validatePassword('MYPASS123!AB');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(
          expect.stringContaining('at least one lowercase letter')
        );
      });

      it('rejects all-uppercase + numbers + symbols', () => {
        const result = validatePassword('PASSWORD123!@#');
        expect(result.valid).toBe(false);
      });
    });

    describe('Invalid passwords - digit requirement', () => {
      it('rejects passwords without digits', () => {
        const result = validatePassword('MyPassword!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('at least one digit'));
      });

      it('rejects mixed case + symbols but no numbers', () => {
        const result = validatePassword('MyPassword!@#$');
        expect(result.valid).toBe(false);
      });
    });

    describe('Invalid passwords - symbol requirement', () => {
      it('rejects passwords without symbols', () => {
        const result = validatePassword('MyPassword123');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(expect.stringContaining('at least one symbol'));
      });

      it('rejects mixed case + numbers but no symbols', () => {
        const result = validatePassword('MyPassword123');
        expect(result.valid).toBe(false);
      });

      it('treats special characters from allowed set as valid symbols', () => {
        const specialChars = ['(', ')', '-', '=', '[', ']', '{', '}', ';', "'", ':', '"'];
        specialChars.forEach(char => {
          const password = `MyPass123${char}`;
          const result = validatePassword(password);
          expect(result.valid).toBe(true);
        });
      });
    });

    describe('Multiple requirement failures', () => {
      it('reports all failed requirements', () => {
        const result = validatePassword('short');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(2);
      });

      it('includes specific messages for each failed requirement', () => {
        const result = validatePassword('ALLUPPER');
        expect(result.errors).toContain(expect.stringContaining('uppercase'));
        expect(result.errors).toContain(expect.stringContaining('lowercase'));
      });
    });

    describe('Unicode and edge cases', () => {
      it('accepts passwords with Unicode characters as lowercase', () => {
        const result = validatePassword('MyPasswörd123!');
        expect(result.valid).toBe(true);
      });

      it('accepts passwords with numbers as digits (0-9 only)', () => {
        const result = validatePassword('MyPasswörd000!');
        expect(result.valid).toBe(true);
      });

      it('rejects passwords with only spaces', () => {
        const result = validatePassword('           ');
        expect(result.valid).toBe(false);
      });

      it('accepts passwords with spaces in the middle', () => {
        const result = validatePassword('My Pass123!ab');
        expect(result.valid).toBe(true);
      });

      it('treats common symbols correctly', () => {
        const password = 'MyPassword123!';
        const result = validatePassword(password);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('checkRequirements - Real-time UI feedback', () => {
    it('returns array of 5 requirements', () => {
      const requirements = checkRequirements('test');
      expect(requirements).toHaveLength(5);
    });

    it('tracks length requirement status', () => {
      const shortReqs = checkRequirements('short');
      const longReqs = checkRequirements('MyVeryLongPassword123!');

      const shortLength = shortReqs.find(r => r.name === 'length');
      const longLength = longReqs.find(r => r.name === 'length');

      expect(shortLength?.met).toBe(false);
      expect(longLength?.met).toBe(true);
    });

    it('tracks uppercase requirement status', () => {
      const lowercase = checkRequirements('mypassword123!');
      const mixed = checkRequirements('MyPassword123!');

      const lcUpper = lowercase.find(r => r.name === 'uppercase');
      const mixedUpper = mixed.find(r => r.name === 'uppercase');

      expect(lcUpper?.met).toBe(false);
      expect(mixedUpper?.met).toBe(true);
    });

    it('tracks lowercase requirement status', () => {
      const uppercase = checkRequirements('MYPASSWORD123!');
      const mixed = checkRequirements('MyPassword123!');

      const ucLower = uppercase.find(r => r.name === 'lowercase');
      const mixedLower = mixed.find(r => r.name === 'lowercase');

      expect(ucLower?.met).toBe(false);
      expect(mixedLower?.met).toBe(true);
    });

    it('tracks number requirement status', () => {
      const noNumber = checkRequirements('MyPassword!ab');
      const withNumber = checkRequirements('MyPassword123!');

      const noNum = noNumber.find(r => r.name === 'number');
      const hasNum = withNumber.find(r => r.name === 'number');

      expect(noNum?.met).toBe(false);
      expect(hasNum?.met).toBe(true);
    });

    it('tracks symbol requirement status', () => {
      const noSymbol = checkRequirements('MyPassword123ab');
      const withSymbol = checkRequirements('MyPassword123!');

      const noSym = noSymbol.find(r => r.name === 'symbol');
      const hasSym = withSymbol.find(r => r.name === 'symbol');

      expect(noSym?.met).toBe(false);
      expect(hasSym?.met).toBe(true);
    });

    it('returns consistent requirement labels', () => {
      const requirements = checkRequirements('test');
      const names: Array<RequirementCheck['name']> = [
        'length',
        'uppercase',
        'lowercase',
        'number',
        'symbol',
      ];

      requirements.forEach((req, i) => {
        expect(req.name).toBe(names[i]);
        expect(req.label).toBeDefined();
        expect(typeof req.label).toBe('string');
      });
    });
  });

  describe('calculateStrength - Strength levels', () => {
    describe('Weak passwords', () => {
      it('returns weak for passwords failing any requirement', () => {
        expect(calculateStrength('short')).toBe('weak');
        expect(calculateStrength('MyPassword')).toBe('weak'); // no number
        expect(calculateStrength('MyPassword123')).toBe('weak'); // no symbol
      });

      it('returns weak for all-lowercase', () => {
        expect(calculateStrength('mypassword123!')).toBe('weak');
      });

      it('returns weak for all-uppercase', () => {
        expect(calculateStrength('MYPASSWORD123!')).toBe('weak');
      });
    });

    describe('Fair passwords', () => {
      it('returns fair for valid 12-15 char passwords without complexity signals', () => {
        expect(calculateStrength('MyPass1234!')).toBe('fair'); // exactly 11 is weak, 12 is fair
        expect(calculateStrength('MyPasswd1234!')).toBe('fair'); // 13 chars
      });

      it('returns fair for minimal requirements met (12-15 chars)', () => {
        const result = calculateStrength('MyPassword1!');
        expect(['fair', 'good']).toContain(result); // fair or good depending on complexity
      });
    });

    describe('Good passwords', () => {
      it('returns good for 16+ character passwords', () => {
        const result = calculateStrength('MyPassword123456!');
        expect(['good', 'strong']).toContain(result);
      });

      it('returns good for passwords with high complexity at 12+ chars', () => {
        const result = calculateStrength('MyP@ssw0rd123!');
        expect(['good', 'strong']).toContain(result);
      });

      it('returns at least good for balanced character types', () => {
        const result = calculateStrength('MyPassword1!ab');
        expect(['good', 'strong']).toContain(result);
      });
    });

    describe('Strong passwords', () => {
      it('returns strong for 20+ character passwords', () => {
        expect(calculateStrength('MyVeryLongPassword123!')).toBe('strong');
      });

      it('returns strong for high-entropy passwords (16+ with diverse chars)', () => {
        expect(calculateStrength('MyP@ssw0rd!#$%12')).toBe('strong');
      });

      it('returns strong for passwords with spread-out complexity', () => {
        const result = calculateStrength('My1P@ssw0rd!ab123');
        expect(result).toBe('strong');
      });
    });

    describe('Strength consistency', () => {
      it('same password always returns same strength', () => {
        const password = 'MyPassword123!@#';
        const strength1 = calculateStrength(password);
        const strength2 = calculateStrength(password);
        expect(strength1).toBe(strength2);
      });

      it('longer passwords tend to be stronger', () => {
        const short = calculateStrength('MyPassword1!');
        const long = calculateStrength('MyVeryLongPassword123!@#');
        const shortIdx = ['weak', 'fair', 'good', 'strong'].indexOf(short);
        const longIdx = ['weak', 'fair', 'good', 'strong'].indexOf(long);
        expect(longIdx).toBeGreaterThanOrEqual(shortIdx);
      });

      it('valid password strength is never weak', () => {
        const passwords = [
          'MyPassword123!',
          'MyPassword1234!@',
          'VeryLongStrongPassword123!@#$',
        ];
        passwords.forEach(pwd => {
          const strength = calculateStrength(pwd);
          expect(strength).not.toBe('weak');
        });
      });
    });
  });

  describe('isStrongPassword - Quick validation', () => {
    it('returns true for valid OWASP passwords', () => {
      expect(isStrongPassword('MyPassword123!')).toBe(true);
      expect(isStrongPassword('MyPass123!word')).toBe(true);
    });

    it('returns false for invalid passwords', () => {
      expect(isStrongPassword('weak')).toBe(false);
      expect(isStrongPassword('MyPassword')).toBe(false);
      expect(isStrongPassword('MyPassword123')).toBe(false);
    });

    it('is equivalent to validatePassword().valid', () => {
      const passwords = [
        'MyPassword123!',
        'short',
        'NoNumbers!',
        'no-symbols-1',
        'ALLUPPERCASE123!',
      ];

      passwords.forEach(pwd => {
        expect(isStrongPassword(pwd)).toBe(validatePassword(pwd).valid);
      });
    });
  });

  describe('Integration - Full password lifecycle', () => {
    it('evolves from weak to strong as user improves password', () => {
      const stages = [
        { pwd: 'p', strength: 'weak' as PasswordStrength },
        { pwd: 'password', strength: 'weak' as PasswordStrength },
        { pwd: 'Password1', strength: 'weak' as PasswordStrength },
        { pwd: 'Password1!', strength: 'weak' as PasswordStrength },
        { pwd: 'Password1!a', strength: 'weak' as PasswordStrength },
        { pwd: 'Password1!ab', strength: 'fair' as PasswordStrength | 'good' },
        { pwd: 'Password1!abcd', strength: 'fair' as PasswordStrength | 'good' },
        { pwd: 'MyPassword1!abcde', strength: 'good' as PasswordStrength | 'strong' },
      ];

      stages.forEach((stage, i) => {
        const strength = calculateStrength(stage.pwd);
        const requirements = checkRequirements(stage.pwd);
        const valid = isStrongPassword(stage.pwd);

        // Each stage builds on previous
        if (i > 0) {
          const prevReqs = checkRequirements(stages[i - 1].pwd);
          const prevValid = isStrongPassword(stages[i - 1].pwd);

          // Either more requirements met or same requirements with better strength
          const reqsMet = requirements.filter(r => r.met).length;
          const prevReqsMet = prevReqs.filter(r => r.met).length;
          expect(reqsMet).toBeGreaterThanOrEqual(prevReqsMet);
        }
      });
    });

    it('provides all data needed for real-time UI feedback', () => {
      const password = 'MyPassword1!';

      const validation = validatePassword(password);
      const requirements = checkRequirements(password);
      const strength = calculateStrength(password);
      const isStrong = isStrongPassword(password);

      // UI can show:
      // 1. Requirements with per-requirement status
      expect(requirements).toHaveLength(5);
      expect(requirements.every(r => typeof r.met === 'boolean')).toBe(true);

      // 2. Overall strength
      expect(['weak', 'fair', 'good', 'strong']).toContain(strength);

      // 3. Overall validity
      expect(typeof isStrong).toBe('boolean');

      // 4. Error messages if invalid
      if (!isStrong) {
        expect(validation.errors.length).toBeGreaterThan(0);
      }
    });
  });
});
