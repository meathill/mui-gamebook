'use client';

import { FormEvent, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: signInError } = await authClient.signIn.email({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message || '登录失败，请检查邮箱和密码');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('发生未知错误，请稍后重试');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-card-bg/95 backdrop-blur-sm p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-4 border-card-border">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold title-fun text-foreground">登录简简</h2>
          <p className="mt-2 text-center text-sm text-foreground/70">仅限受邀用户访问</p>
        </div>
        <form
          className="mt-8 space-y-6"
          onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label
                htmlFor="email-address"
                className="sr-only">
                邮箱地址
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="relative block w-full rounded-t-2xl border-0 py-3 px-4 text-foreground bg-background ring-2 ring-inset ring-card-border placeholder:text-foreground/50 focus:z-10 focus:ring-4 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                placeholder="邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="sr-only">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="relative block w-full rounded-b-2xl border-0 py-3 px-4 text-foreground bg-background ring-2 ring-inset ring-card-border placeholder:text-foreground/50 focus:z-10 focus:ring-4 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                placeholder="密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-2xl border-2 border-red-200">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-base py-3">
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
