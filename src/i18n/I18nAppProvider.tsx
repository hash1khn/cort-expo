import React, { useEffect, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { initI18n, i18n } from './index';

type Props = {
  children: React.ReactNode;
};

export function I18nAppProvider({ children }: Props) {
  const [ready, setReady] = useState(i18n.isInitialized);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    initI18n()
      .then(() => {
        if (!cancelled) {
          setReady(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to initialize i18n');
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return null;
  }

  if (!ready) {
    return null;
  }

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
