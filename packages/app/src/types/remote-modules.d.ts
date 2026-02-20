declare module 'https://unpkg.com/@roudanio/awesome-auth@0.1.5/dist/awesome-auth.js' {
  export function getInstance(options: { googleId: string; root: string; prefix?: string }): unknown;
}

declare module 'https://unpkg.com/@roudanio/awesome-comment@0.10.5/dist/awesome-comment.js' {
  const AwesomeComment: {
    init: (
      root: HTMLElement,
      options: {
        turnstileSiteKey?: string;
        postId: string;
        siteId: string;
        apiUrl: string;
        awesomeAuth: unknown;
        locale?: string;
      },
    ) => void;
  };
  export default AwesomeComment;
}
