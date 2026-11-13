import { describe, expect, it } from 'vitest';
import { emailError, newPasswordErrors, passwordError, passwordStrength } from './validation';

describe('validation', () => {
  it('checks emails and password length', () => {
    expect(emailError('sam@example.com')).toBeUndefined();
    expect(emailError('sam@')).toMatch(/valid email/);
    expect(passwordError('short')).toMatch(/8 characters/);
    expect(passwordError('long enough')).toBeUndefined();
  });

  it('checks the new password, its confirmation, and that it differs from the current one', () => {
    expect(newPasswordErrors('Whisky&Oat1', 'Whisky&Oat1')).toEqual({ next: undefined, confirm: undefined });
    expect(newPasswordErrors('Whisky&Oat1', 'Whisky&Oat2').confirm).toMatch(/don’t match/);
    expect(newPasswordErrors('short', 'short').next).toMatch(/8 characters/);
    expect(newPasswordErrors('Whisky&Oat1', 'Whisky&Oat1', 'Whisky&Oat1').next).toMatch(/different/);
  });

  it('scores password strength', () => {
    expect(passwordStrength('abc').label).toBe('Too short');
    expect(passwordStrength('abcdefgh').label).toBe('Weak');
    expect(passwordStrength('Abcdefgh1').label).toBe('Good');
    expect(passwordStrength('Abcdefgh1!').label).toBe('Strong');
  });
});
