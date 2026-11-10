import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { detectTimeZone } from '@/domain/date';
import { emailError, passwordError, requiredError } from '@/domain/validation';
import { useBackend, useSession } from '@/state/session';
import { useForm } from '@/state/useForm';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { Field, TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-whisky" />
      <span>{children}</span>
    </label>
  );
}

function EmailField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label="Email" error={error}>
      {(c) => (
        <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} type="email" autoComplete="email" placeholder="name@example.com" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  );
}

export function LoginPage() {
  const { auth } = useBackend();
  const { session } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const form = useForm(
    { email: '', password: '', remember: true },
    (v) => ({ email: emailError(v.email), password: passwordError(v.password) }),
    async (v) => {
      await auth.signIn({ email: v.email.trim(), password: v.password, remember: v.remember });
      navigate(from, { replace: true });
    },
  );

  if (session) return <Navigate to={from} replace />;

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to pick up where you left off." tabs>
      <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
        <EmailField value={form.values.email} onChange={form.set('email')} error={form.errors.email} />
        <Field label="Password" error={form.errors.password} aside={<Link to="/reset-password" className="text-[13px] font-semibold">Forgot password?</Link>}>
          {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="current-password" value={form.values.password} onChange={form.set('password')} />}
        </Field>
        <Checkbox checked={form.values.remember} onChange={form.set('remember')}>
          Keep me signed in on this device
        </Checkbox>
        <Button type="submit" size="lg" block loading={form.busy}>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}

export function SignupPage() {
  const { auth } = useBackend();
  const { session } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm(
    { name: '', email: '', password: '', agree: false },
    (v) => ({
      name: requiredError(v.name, 'Tell us what to call you.'),
      email: emailError(v.email),
      password: passwordError(v.password),
      agree: v.agree ? undefined : 'Please accept the terms to continue.',
    }),
    async (v) => {
      const result = await auth.signUp({ name: v.name.trim(), email: v.email.trim(), password: v.password, timezone: detectTimeZone() });
      if (result.needsConfirmation) {
        setSentTo(v.email.trim());
        return;
      }
      await auth.signIn({ email: v.email.trim(), password: v.password, remember: true });
      toast.show('Account created. Welcome to Ledger.', { kind: 'success' });
      navigate('/welcome', { replace: true });
    },
  );

  if (session && !sentTo) return <Navigate to="/" replace />;

  return (
    <AuthLayout title="Create your account" subtitle="Free, and your data stays exportable." tabs>
      {sentTo ? (
        <Banner kind="success" title="Check your inbox">
          We sent a confirmation link to {sentTo}. Open it, then log in.
        </Banner>
      ) : (
        <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
          <Field label="Name" error={form.errors.name}>
            {(c) => (
              <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} autoComplete="name" placeholder="What should we call you?" value={form.values.name} onChange={(e) => form.set('name')(e.target.value)} />
            )}
          </Field>
          <EmailField value={form.values.email} onChange={form.set('email')} error={form.errors.email} />
          <Field label="Password" error={form.errors.password}>
            {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="new-password" showStrength value={form.values.password} onChange={form.set('password')} />}
          </Field>
          <div className="flex flex-col gap-1">
            <Checkbox checked={form.values.agree} onChange={form.set('agree')}>
              I agree to the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy policy</Link>
            </Checkbox>
            {form.errors.agree && <span className="text-[13px] text-error">{form.errors.agree}</span>}
          </div>
          <Button type="submit" size="lg" block loading={form.busy}>
            Create account
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export function ResetPasswordPage() {
  const { auth } = useBackend();
  const [sent, setSent] = useState(false);
  const form = useForm(
    { email: '' },
    (v) => ({ email: emailError(v.email) }),
    async (v) => {
      await auth.requestPasswordReset(v.email.trim());
      setSent(true);
    },
  );
  return (
    <AuthLayout title="Reset your password" subtitle="We’ll email you a link to set a new one.">
      <Link to="/login" className="-mt-2 self-start text-sm font-semibold">
        ← Back to log in
      </Link>
      {sent ? (
        <Banner title="Check your inbox">If that email has an account, a reset link is on its way.</Banner>
      ) : (
        <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
          <EmailField value={form.values.email} onChange={form.set('email')} error={form.errors.email} />
          <Button type="submit" size="lg" block loading={form.busy}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

/** Landing page of the password-reset email link. */
export function UpdatePasswordPage() {
  const { auth } = useBackend();
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const toast = useToast();
  const form = useForm(
    { password: '' },
    (v) => ({ password: passwordError(v.password) }),
    async (v) => {
      await auth.updatePassword(v.password);
      toast.show('Password updated.', { kind: 'success' });
      navigate('/', { replace: true });
    },
  );
  return (
    <AuthLayout title="Set a new password" subtitle="Choose something you don’t use anywhere else.">
      {ready && !session ? (
        <Banner kind="warning" title="This link has expired">
          Request a new one from <Link to="/reset-password">Reset password</Link>.
        </Banner>
      ) : (
        <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
          <Field label="New password" error={form.errors.password}>
            {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="new-password" showStrength value={form.values.password} onChange={form.set('password')} />}
          </Field>
          <Button type="submit" size="lg" block loading={form.busy}>
            Save password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
