import { useState } from 'react';
import { passwordError } from '@/domain/validation';
import { PasswordInput } from '@/features/auth/PasswordInput';
import { errorText } from '@/state/mutations';
import { useBackend, useRepos } from '@/state/session';
import { useForm } from '@/state/useForm';
import { Button } from '@/ui/Button';
import { Field, TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { SettingsCard } from './SettingsPage';

const CONFIRM_WORD = 'DELETE';

export function AccountTab() {
  const { auth, capabilities } = useBackend();
  const grace = capabilities.deletionGraceDays;
  const { repos } = useRepos();
  const toast = useToast();
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const password = useForm(
    { password: '' },
    (v) => ({ password: passwordError(v.password) }),
    async (v) => {
      await auth.updatePassword(v.password);
      password.reset();
      toast.show('Password updated.', { kind: 'success' });
    },
  );

  const signOut = async (scope: 'local' | 'global') => {
    try {
      await auth.signOut(scope);
      toast.show(scope === 'global' ? 'Signed out on every device.' : 'Signed out. See you soon.');
    } catch (error) {
      toast.show(errorText(error), { kind: 'error' });
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await repos.profiles.requestDeletion();
      await auth.signOut(capabilities.globalSignOut ? 'global' : 'local');
      toast.show(grace ? `Account scheduled for deletion in ${grace} days. Log in before then to cancel.` : 'Your account and all its data were deleted.', {
        kind: 'warning',
      });
    } catch (error) {
      toast.show(errorText(error), { kind: 'error' });
      setDeleting(false);
    }
  };

  return (
    <>
      <SettingsCard title="Password" titleId="pw-h">
        <form noValidate onSubmit={password.onSubmit} className="flex flex-col gap-4">
          <Field label="New password" error={password.errors.password}>
            {(c) => <PasswordInput id={c.id} describedBy={c.describedBy} invalid={c.invalid} autoComplete="new-password" showStrength value={password.values.password} onChange={password.set('password')} />}
          </Field>
          <Button type="submit" variant="secondary" className="self-end" loading={password.busy}>
            Update password
          </Button>
        </form>
      </SettingsCard>

      <SettingsCard title="Sessions" titleId="sessions-h" description={capabilities.globalSignOut ? 'Sign out here, or everywhere you’re logged in.' : 'Sign out of Ledger on this device.'}>
        <div className="flex flex-wrap gap-2">
          {capabilities.globalSignOut && (
            <Button variant="secondary" onClick={() => signOut('global')}>
              Sign out everywhere
            </Button>
          )}
          <Button variant="dark" icon="logout" onClick={() => signOut('local')}>
            Sign out
          </Button>
        </div>
      </SettingsCard>

      <SettingsCard
        tone="danger"
        title="Delete account"
        titleId="delete-h"
        description={
          grace
            ? `Your account and all data are deleted after ${grace} days. Log in before then to cancel. Export your data first if you want a copy.`
            : 'Your account and all data are deleted right away and can’t be recovered. Export your data first if you want a copy.'
        }
      >
        <div className="flex flex-wrap items-end gap-2.5">
          <Field label={`Type ${CONFIRM_WORD} to confirm`} className="min-w-[220px] flex-1">
            {(c) => <TextInput id={c.id} autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
          </Field>
          <Button variant="danger" disabled={confirm !== CONFIRM_WORD} loading={deleting} onClick={deleteAccount}>
            Delete my account
          </Button>
        </div>
      </SettingsCard>
    </>
  );
}
