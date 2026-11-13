import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { EmailActionMode, EmailActionService } from '@/data/ports';
import { newPasswordErrors } from '@/domain/validation';
import { errorText } from '@/state/mutations';
import { useBackend } from '@/state/session';
import { useForm } from '@/state/useForm';
import { Banner } from '@/ui/Banner';
import { Button } from '@/ui/Button';
import { LoadingScreen } from '@/ui/Display';
import { useToast } from '@/ui/Toast';
import { AuthLayout } from './AuthLayout';
import { NewPasswordFields } from './NewPasswordFields';

/**
 * Landing page for the links in Ledger's emails (Firebase "custom action URL"):
 * reset password, confirm email, confirm a new email, restore an old email.
 */

const COPY: Record<Exclude<EmailActionMode, 'resetPassword'>, { title: string; done: string }> = {
  verifyEmail: { title: 'Confirming your email', done: 'Your email is confirmed. You can log in now.' },
  verifyAndChangeEmail: { title: 'Confirming your new email', done: 'Your new email is confirmed. Log in with it from now on.' },
  recoverEmail: { title: 'Restoring your email', done: 'Your previous email is back. If you didn’t ask for the change, reset your password now.' },
};

export function AuthActionPage() {
  const [params] = useSearchParams();
  const { emailActions } = useBackend();
  const mode = params.get('mode') as EmailActionMode | null;
  const code = params.get('oobCode');

  if (!emailActions || !mode || !code || !(mode === 'resetPassword' || mode in COPY)) {
    return (
      <AuthLayout title="This link doesn’t work" subtitle="It may be incomplete, expired or already used.">
        <Banner kind="error" title="We couldn’t open this link">
          Request a new one from <Link to="/reset-password">Reset password</Link>, or <Link to="/login">log in</Link>.
        </Banner>
      </AuthLayout>
    );
  }
  return mode === 'resetPassword' ? <ResetFromLink actions={emailActions} code={code} /> : <ApplyLink actions={emailActions} code={code} mode={mode} />;
}

function ResetFromLink({ actions, code }: { actions: EmailActionService; code: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const [state, setState] = useState<{ email?: string; error?: string }>({});
  const form = useForm(
    { next: '', confirm: '' },
    (v) => newPasswordErrors(v.next, v.confirm),
    async (v) => {
      await actions.confirmPasswordReset(code, v.next);
      toast.show('Password changed. Log in with your new password.', { kind: 'success' });
      navigate('/login', { replace: true });
    },
  );

  useEffect(() => {
    actions.checkResetCode(code).then(
      (email) => setState({ email }),
      (error) => setState({ error: errorText(error) }),
    );
  }, [actions, code]);

  if (!state.email && !state.error) return <LoadingScreen />;
  return (
    <AuthLayout title="Set a new password" subtitle={state.email ? `For ${state.email}. Choose something you don’t use anywhere else.` : 'This reset link can’t be used.'}>
      {state.error ? (
        <Banner kind="error" title="This link has expired">
          {state.error} <Link to="/reset-password">Send a new link</Link>.
        </Banner>
      ) : (
        <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
          <NewPasswordFields values={form.values} errors={form.errors} onNext={form.set('next')} onConfirm={form.set('confirm')} />
          <Button type="submit" size="lg" block loading={form.busy}>
            Save new password
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

function ApplyLink({ actions, code, mode }: { actions: EmailActionService; code: string; mode: keyof typeof COPY }) {
  const navigate = useNavigate();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    actions.applyCode(code).then(
      () => setResult({ ok: true, message: COPY[mode].done }),
      (error) => setResult({ ok: false, message: errorText(error) }),
    );
  }, [actions, code, mode]);

  if (!result) return <LoadingScreen />;
  return (
    <AuthLayout title={COPY[mode].title} subtitle={result.ok ? 'All done.' : 'Something went wrong.'}>
      <Banner kind={result.ok ? 'success' : 'error'} title={result.ok ? 'Done' : 'We couldn’t use this link'}>
        {result.message}
      </Banner>
      <Button size="lg" block onClick={() => navigate(mode === 'recoverEmail' ? '/reset-password' : '/login', { replace: true })}>
        {mode === 'recoverEmail' ? 'Reset my password' : 'Go to log in'}
      </Button>
    </AuthLayout>
  );
}
