export const PASSWORD_MIN = 8;

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function emailError(value: string): string | undefined {
  return isValidEmail(value) ? undefined : 'Enter a valid email, like name@example.com.';
}

export function passwordError(value: string): string | undefined {
  return value.length >= PASSWORD_MIN ? undefined : `Use at least ${PASSWORD_MIN} characters.`;
}

export function requiredError(value: string, message: string): string | undefined {
  return value.trim() ? undefined : message;
}

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: StrengthLevel;
  label: 'Too short' | 'Weak' | 'Fair' | 'Good' | 'Strong';
}

export function passwordStrength(value: string): PasswordStrength {
  const checks = [
    value.length >= PASSWORD_MIN,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length as StrengthLevel;
  const labels = ['Weak', 'Weak', 'Fair', 'Good', 'Strong'] as const;
  return { score, label: value.length < PASSWORD_MIN ? 'Too short' : labels[score] };
}
