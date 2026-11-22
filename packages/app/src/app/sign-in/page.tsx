'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { trackLogin } from '@mui-gamebook/site-common/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSafeRedirect } from '@/lib/sign-in-redirect';

type Step = 'email' | 'otp';
/** root 的应急密码登录（服务端只放行 NEXT_PUBLIC_ROOT_USER_EMAIL 对应邮箱） */
type Mode = 'otp' | 'password';

export default function SignInPage() {
  const [mode, setMode] = useState<Mode>('otp');
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations('auth');

  async function sendOtp() {
    setLoading(true);
    setError('');
    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      });
      if (sendError) {
        setError(sendError.message || t('sendCodeError'));
      } else {
        setStep('otp');
      }
    } catch (err) {
      setError(t('unknownError') + ' ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    void sendOtp();
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: verifyError } = await authClient.signIn.emailOtp({ email, otp });
      if (verifyError) {
        setError(verifyError.message || t('verifyError'));
      } else {
        // OTP 无法在发送前区分注册/登录，统一按登录事件上报
        trackLogin();
        router.push(getSafeRedirect(window.location.search));
        router.refresh();
      }
    } catch (err) {
      setError(t('unknownError') + ' ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdminSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error: signInError } = await authClient.signIn.email({ email, password });
      if (signInError) {
        setError(signInError.message || t('signInError'));
      } else {
        trackLogin();
        router.push(getSafeRedirect(window.location.search));
        router.refresh();
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
          <h2 className="text-center text-2xl font-bold text-gray-900">{t('signInTitle')}</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {mode === 'password' ? t('adminSubtitle') : t('signInSubtitle')}
          </p>
        </div>

        {mode === 'otp' && step === 'email' && (
          <form
            className="space-y-4"
            onSubmit={handleSendOtp}>
            <div>
              <Label
                htmlFor="email-address"
                className="mb-1 text-gray-700">
                {t('email')}
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block text-gray-900"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-2 text-xs text-gray-500">{t('otpHint')}</p>
            </div>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
            <button
              disabled={loading}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('loading') : t('sendCode')}
            </button>
          </form>
        )}

        {mode === 'otp' && step === 'otp' && (
          <form
            className="space-y-4"
            onSubmit={handleVerifyOtp}>
            <div>
              <Label
                htmlFor="otp-code"
                className="mb-1 text-gray-700">
                {t('otpLabel')}
              </Label>
              <Input
                id="otp-code"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                maxLength={6}
                className="block text-center text-lg tracking-[0.5em] text-gray-900"
                placeholder={t('otpPlaceholder')}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <p className="mt-2 text-xs text-gray-500">{t('otpSentHint')}</p>
            </div>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
            <button
              disabled={loading || otp.length !== 6}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('loading') : t('verifyButton')}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setError('');
                }}>
                {t('backToEmail')}
              </button>
              <button
                type="button"
                className="text-orange-600 hover:text-orange-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                disabled={loading}
                onClick={() => void sendOtp()}>
                {t('resendCode')}
              </button>
            </div>
          </form>
        )}

        {mode === 'password' && (
          <form
            className="space-y-4"
            onSubmit={handleAdminSignIn}>
            <div>
              <Label
                htmlFor="email-address"
                className="mb-1 text-gray-700">
                {t('email')}
              </Label>
              <Input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="block text-gray-900"
                placeholder={t('emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label
                htmlFor="password"
                className="mb-1 text-gray-700">
                {t('password')}
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block text-gray-900"
                placeholder={t('passwordPlaceholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded-lg">{error}</div>}
            <button
              disabled={loading}
              className="w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? t('loading') : t('signInButton')}
            </button>
          </form>
        )}

        <div className="text-center text-sm text-gray-500">
          {mode === 'otp' ? (
            <button
              type="button"
              className="hover:text-gray-700"
              onClick={() => {
                setMode('password');
                setError('');
              }}>
              {t('adminSignIn')}
            </button>
          ) : (
            <button
              type="button"
              className="hover:text-gray-700"
              onClick={() => {
                setMode('otp');
                setStep('email');
                setPassword('');
                setError('');
              }}>
              {t('backToOtp')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
