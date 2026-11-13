import { Field } from '@/ui/Field';
import { PasswordInput } from './PasswordInput';

interface NewPasswordFieldsProps {
  values: { next: string; confirm: string };
  errors: { next?: string; confirm?: string };
  onNext: (value: string) => void;
  onConfirm: (value: string) => void;
}

/** "New password" + "Confirm new password", used wherever a password is set. */
export function NewPasswordFields({ values, errors, onNext, onConfirm }: NewPasswordFieldsProps) {
  return (
    <>
      <Field label="New password" error={errors.next}>
        {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="new-password" showStrength value={values.next} onChange={onNext} />}
      </Field>
      <Field label="Confirm new password" error={errors.confirm}>
        {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="new-password" value={values.confirm} onChange={onConfirm} />}
      </Field>
    </>
  );
}
