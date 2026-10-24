// 登录后的回跳只接受站内相对路径；缺失或不合法时回到首页。
export function getSafeRedirect(search: string): string {
  const redirect = new URLSearchParams(search).get('redirect');
  if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) return redirect;
  return '/';
}
