import { Link } from 'react-router-dom';
import { APP_NAME } from '@/app/config';
import { Banner } from '@/ui/Banner';
import { EmptyState } from '@/ui/Display';
import { Wordmark } from '@/ui/Logo';

/** Privacy policy and terms (design §6): placeholder text the owner must replace before a public launch. */

const CONTENT = {
  privacy: {
    title: 'Privacy policy',
    sections: [
      ['What we store', `Your name, email address, time zone, habits, check-ins, notes and settings. Optionally a profile photo.`],
      ['Where it is stored', `With our database provider (Supabase), in the EU. Only you can read your data.`],
      ['Your rights', `Export everything as JSON from Settings › Data at any time. Delete your account from Settings › Account; all data is removed after 7 days.`],
      ['Contact', `[OWNER CONTACT EMAIL]`],
    ],
  },
  terms: {
    title: 'Terms of use',
    sections: [
      ['Using Ledger', `${APP_NAME} is provided as is, for personal habit tracking.`],
      ['Your account', `Keep your password safe. You are responsible for activity on your account.`],
      ['Changes', `We may update these terms; we will tell you in the app when we do.`],
      ['Contact', `[OWNER CONTACT EMAIL]`],
    ],
  },
} as const;

export function LegalPage({ kind }: { kind: keyof typeof CONTENT }) {
  const page = CONTENT[kind];
  return (
    <div className="mx-auto flex max-w-[720px] flex-col gap-7 px-4 py-10">
      <Link to="/" className="self-start no-underline">
        <Wordmark />
      </Link>
      <h1 className="m-0 font-display text-[clamp(32px,5vw,48px)] font-normal tracking-tight">{page.title}</h1>
      <Banner kind="warning" title="Placeholder text">
        The owner must replace this page with reviewed legal text before anyone else signs up.
      </Banner>
      {page.sections.map(([heading, body]) => (
        <section key={heading} className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-[22px] font-semibold">{heading}</h2>
          <p className="m-0 leading-relaxed text-muted">{body}</p>
        </section>
      ))}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-6 px-4">
      <EmptyState icon="search" title="This page doesn’t exist" action={<Link to="/">Go to Today</Link>}>
        The link may be old, or the habit may have been deleted.
      </EmptyState>
    </div>
  );
}
