import { useState, type FormEvent } from 'react';
import { useToast } from '@/ui/Toast';
import { errorText } from './mutations';

type Values = Record<string, string | boolean>;
export type Errors<T> = Partial<Record<keyof T, string>>;
/** Widens literal initial values (`true`, `''`) so fields accept any boolean / string. */
type Widen<T> = { [K in keyof T]: T[K] extends boolean ? boolean : string };

/**
 * Shared form behaviour (design §8.8): inline errors under fields, a toast summary when
 * submit fails, a busy state while saving, and server errors shown as an error toast.
 */
export function useForm<I extends Values, T extends Values = Widen<I>>(initial: I, validate: (values: T) => Errors<T>, submit: (values: T) => Promise<void>) {
  const [values, setValues] = useState<T>(initial as unknown as T);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const set =
    <K extends keyof T>(key: K) =>
    (value: T[K]) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => ({ ...e, [key]: undefined }));
    };

  const onSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.values(found).some(Boolean)) {
      toast.show('Please fix the highlighted fields.', { kind: 'error' });
      return;
    }
    setBusy(true);
    try {
      await submit(values);
    } catch (error) {
      toast.show(errorText(error), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return { values, set, errors, busy, onSubmit, reset: () => setValues(initial as unknown as T) };
}
