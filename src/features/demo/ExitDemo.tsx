import { useState, type ReactNode } from 'react';
import { FEEDBACK_MAX, feedbackError } from '@/domain/feedback';
import type { FeedbackSender } from '@/data/ports';
import { errorText } from '@/state/mutations';
import { useBackend } from '@/state/session';
import { Button } from '@/ui/Button';
import { Dialog } from '@/ui/Dialog';
import { Field, TextArea } from '@/ui/Field';
import { useToast } from '@/ui/Toast';

/**
 * Leaving the demo: asks for anonymous feedback first (text only, no contact details), with
 * skipping always one click away. Used by every "Exit demo" button.
 */
export function useExitDemo(): { exit: () => void; dialog: ReactNode } {
  const { auth, feedback } = useBackend();
  const [asking, setAsking] = useState(false);
  const leave = () => void auth.signOut();
  return {
    exit: () => (feedback ? setAsking(true) : leave()),
    dialog: asking && feedback ? <FeedbackDialog sender={feedback} onClose={() => setAsking(false)} onLeave={leave} /> : null,
  };
}

function FeedbackDialog({ sender, onClose, onLeave }: { sender: FeedbackSender; onClose: () => void; onLeave: () => void }) {
  const toast = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  const send = async () => {
    const problem = feedbackError(text);
    setError(problem);
    if (problem) return;
    setSending(true);
    try {
      await sender.send(text);
      onLeave();
    } catch (e) {
      toast.show(errorText(e), { kind: 'error' });
      setSending(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title="Before you go"
      footer={
        <>
          <Button variant="secondary" onClick={onLeave}>
            Exit without feedback
          </Button>
          <Button loading={sending} onClick={send}>
            Send and exit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3 pb-1">
        <p className="m-0 text-[15px] text-muted">What did you think of Ledger? Anything missing or confusing?</p>
        <Field label="Your feedback" error={error} hint={`Anonymous: only your text and the time are saved. Please don’t include personal details. ${text.length}/${FEEDBACK_MAX}`}>
          {(c) => (
            <TextArea
              id={c.id}
              aria-describedby={c.describedBy}
              invalid={c.invalid}
              rows={5}
              maxLength={FEEDBACK_MAX}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </Field>
      </div>
    </Dialog>
  );
}
