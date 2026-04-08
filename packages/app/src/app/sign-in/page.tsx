'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

type Mode = 'signIn' | 'signUp';

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signIn') {
        const { error: signInError } = await authClient.signIn.email({
          email,
          password,
        });
        if (signInError) {
          setError(signInError.message || t('signInError'));
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        const { error: signUpError } = await authClient.signUp.email({
          email,
          password,
          name: name || email.split('@')[0],
        });
        if (signUpError) {
          setError(signUpError.message || t('signUpError'));
        } else {
          router.push('/');
          router.refresh();
        }
      }
    } catch (err) {
      setError(t('unknownError') + ' ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg border border-gray-200">
        <div>
          <h2 className="text-center text-2xl font-bold text-gray-900">
            {mode === 'signIn' ? t('signInTitle') : t('signUpTitle')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'signIn' ? t('signInSubtitle') : t('signUpSubtitle')}
          </p>
        </div>
        <form
          className="space-y-4"
          onSubmit={handleSubmit}>
          {mode === 'signUp' && (
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1">
                {t('name')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                placeholder={t('namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label
              htmlFor="email-address"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t('email')}
            </label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1">
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
              required
              minLength={8}
              className="block w-full rounded-lg border border-gray-300 py-2 px-3 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
              placeholder={t('passwordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}

          <button
            disabled={loading}
            className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? t('loading') : mode === 'signIn' ? t('signInButton') : t('signUpButton')}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          {mode === 'signIn' ? (
            <p>
              {t('noAccount')}{' '}
              <button
                type="button"
                className="text-orange-600 hover:text-orange-700 font-medium"
                onClick={() => {
                  setMode('signUp');
                  setError('');
                }}>
                {t('goSignUp')}
              </button>
            </p>
          ) : (
            <p>
              {t('hasAccount')}{' '}
              <button
                type="button"
                className="text-orange-600 hover:text-orange-700 font-medium"
                onClick={() => {
                  setMode('signIn');
                  setError('');
                }}>
                {t('goSignIn')}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
