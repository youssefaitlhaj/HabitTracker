import { useRef, useState } from 'react';
import { AVATAR_MAX_BYTES } from '@/data/defaults';
import { emailError, requiredError } from '@/domain/validation';
import { useProfileUpdate } from '@/state/actions';
import type { Ledger } from '@/state/ledger';
import { errorText, useRefreshLedger } from '@/state/mutations';
import { useBackend, useRepos } from '@/state/session';
import { useForm } from '@/state/useForm';
import { Button } from '@/ui/Button';
import { Avatar } from '@/ui/Display';
import { Field, Select, TextInput } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { SettingsCard } from './SettingsPage';

function timeZones(current: string): string[] {
  const all = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [];
  return all.includes(current) ? all : [current, ...all];
}

export function ProfileTab({ ledger }: { ledger: Ledger }) {
  const { profile } = ledger;
  const { auth } = useBackend();
  const update = useProfileUpdate();
  const toast = useToast();
  const initial = { name: profile.name, email: profile.email, timezone: profile.timezone };
  const form = useForm(
    initial,
    (v) => ({ name: requiredError(v.name, 'Display name can’t be empty.'), email: emailError(v.email) }),
    async (v) => {
      update.mutate({ name: v.name.trim(), timezone: v.timezone });
      if (v.email.trim() !== profile.email) {
        const { needsConfirmation } = await auth.changeEmail(v.email.trim());
        toast.show(needsConfirmation ? `Profile saved. Confirm your new email via the link sent to ${v.email.trim()}.` : 'Profile and email saved.', { kind: needsConfirmation ? 'info' : 'success' });
        if (needsConfirmation) form.set('email')(profile.email);
        return;
      }
      toast.show('Profile saved.', { kind: 'success' });
    },
  );
  const dirty = JSON.stringify(form.values) !== JSON.stringify(initial);

  return (
    <SettingsCard title="Profile" titleId="profile-h">
      <AvatarPicker url={profile.avatarUrl} name={form.values.name || profile.email} />
      <form noValidate onSubmit={form.onSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 tablet:grid-cols-2">
          <Field label="Display name" error={form.errors.name}>
            {(c) => <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} maxLength={80} value={form.values.name} onChange={(e) => form.set('name')(e.target.value)} />}
          </Field>
          <Field label="Email" error={form.errors.email}>
            {(c) => <TextInput id={c.id} aria-describedby={c.describedBy} invalid={c.invalid} type="email" value={form.values.email} onChange={(e) => form.set('email')(e.target.value)} />}
          </Field>
          <Field label="Time zone" hint="“Today” follows this time zone.">
            {(c) => (
              <Select id={c.id} aria-describedby={c.describedBy} value={form.values.timezone} onChange={(e) => form.set('timezone')(e.target.value)}>
                {timeZones(profile.timezone).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <div className="flex justify-end gap-2.5 border-t border-line-soft pt-4">
          <Button variant="quiet" disabled={!dirty} onClick={form.reset}>
            Discard
          </Button>
          <Button type="submit" disabled={!dirty} loading={form.busy}>
            Save changes
          </Button>
        </div>
      </form>
    </SettingsCard>
  );
}

function AvatarPicker({ url, name }: { url: string | null; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const { repos } = useRepos();
  const refresh = useRefreshLedger();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const change = async (file: File | null) => {
    if (file && file.size > AVATAR_MAX_BYTES) return toast.show('Pick an image under 2 MB.', { kind: 'error' });
    setBusy(true);
    try {
      await repos.profiles.setAvatar(file);
      await refresh();
      toast.show(file ? 'Photo updated.' : 'Photo removed. Showing your initials.', { kind: file ? 'success' : 'info' });
    } catch (error) {
      toast.show(errorText(error), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar url={url} name={name} size={72} />
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => change(e.target.files?.[0] ?? null)} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" icon="upload" loading={busy} onClick={() => input.current?.click()}>
          Upload photo
        </Button>
        {url && (
          <Button size="sm" variant="quiet" onClick={() => change(null)}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
