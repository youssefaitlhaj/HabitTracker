import type { ProfilePatch } from '@/data/ports';
import { MAX_REST_DAYS } from '@/domain/habits';
import { useProfileUpdate } from '@/state/actions';
import type { Ledger } from '@/state/ledger';
import { Segmented, Stepper, Switch } from '@/ui/Choice';
import { useTheme, type ThemeChoice } from '@/ui/theme';
import { useToast } from '@/ui/Toast';
import { SettingsCard, SettingsRow } from './SettingsPage';

export function PreferencesTab({ ledger }: { ledger: Ledger }) {
  const { profile } = ledger;
  const update = useProfileUpdate();
  const toast = useToast();
  const theme = useTheme();
  const save = (patch: ProfilePatch, message = 'Preference saved.') => {
    update.mutate(patch);
    toast.show(message, { kind: 'success' });
  };

  return (
    <SettingsCard title="Preferences" titleId="prefs-h">
      <SettingsRow label="Theme" hint="Applies on this device. System follows your phone or computer.">
        <Segmented<ThemeChoice>
          label="Theme"
          value={theme.choice}
          onChange={theme.setChoice}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' },
          ]}
        />
      </SettingsRow>
      <SettingsRow label="Week starts on" hint="Changing this recalculates rest days and weekly habits for all history.">
        <Segmented
          label="Week starts on"
          value={profile.weekStart}
          onChange={(weekStart) => save({ weekStart }, `Weeks now start on ${weekStart === 'monday' ? 'Monday' : 'Sunday'}.`)}
          options={[
            { value: 'monday', label: 'Monday' },
            { value: 'sunday', label: 'Sunday' },
          ]}
        />
      </SettingsRow>
      <SettingsRow label="Rest days per week" hint="Default for new habits.">
        <Stepper
          label="rest days per week"
          value={profile.defaultRestDays}
          min={0}
          max={MAX_REST_DAYS}
          onChange={(defaultRestDays) => save({ defaultRestDays })}
          onLimit={(edge) => edge === 'max' && toast.show('Two rest days a week is the maximum.', { kind: 'warning' })}
        />
      </SettingsRow>
      <SettingsRow label="Show streaks" hint="Streak counts on Today.">
        <Switch label="Show streaks" checked={profile.showStreaks} onChange={(showStreaks) => save({ showStreaks })} />
      </SettingsRow>
      <SettingsRow label="Celebrate perfect days" hint="A short glow on the ring when everything is done.">
        <Switch label="Celebrate perfect days" checked={profile.celebrate} onChange={(celebrate) => save({ celebrate })} />
      </SettingsRow>
    </SettingsCard>
  );
}
