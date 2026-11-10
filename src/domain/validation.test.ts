import { describe, expect, it } from 'vitest';
import { emailError, passwordError, passwordStrength } from './validation';

describe('validation', () => {
  it('checks emails and password length', () => {
    expect(emailError('sam@example.com')).toBeUndefined();
    expect(emailError('sam@')).toMatch(/valid email/);
    expect(passwordError('short')).toMatch(/8 characters/);
    expect(passwordError('long enough')).toBeUndefined();
  });

  it('scores password strength', () => {
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('abcdefgh').label).toBe('Weak');
    expect(passwordStrength('Abcdefgh1').label).toBe('Good');
    expect(passwordStrength('Abcdefgh1!').label).toBe('Strong');
  });
});
