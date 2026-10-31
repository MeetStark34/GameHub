import Link from 'next/link';
import { DEVELOPER, DEVELOPER_PROFILE_PATH } from '@/config/site';
import { getTranslator } from '@/i18n/server';
import { Wordmark } from '@/components/brand';

export async function Footer() {
  const { t } = await getTranslator();
  // The credit template places {name} where the language needs it.
  const [before, after = ''] = t('footer.madeWith').split('{name}');
  return (
    <footer className="mb-16 border-t border-border xl:mb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Wordmark />
          <span className="hidden sm:inline">{t('brand.tagline')}</span>
        </div>
        <nav aria-label={t('footer.label')} className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            {before}
            <Link href={DEVELOPER_PROFILE_PATH} className="font-semibold text-fg underline-offset-4 hover:text-accent hover:underline">
              {DEVELOPER.creditName}
            </Link>
            {after}
          </span>
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <Link href="/how-to-play" className="hover:text-fg">
            {t('footer.howToPlay')}
          </Link>
          <Link href="/leaderboards" className="hover:text-fg">
            {t('footer.leaderboards')}
          </Link>
          <Link href="/privacy" className="hover:text-fg">
            {t('footer.privacy')}
          </Link>
          <Link href="/settings#themes" className="hover:text-fg">
            {t('footer.themes')}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
