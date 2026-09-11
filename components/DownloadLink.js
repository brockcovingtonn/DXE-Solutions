'use client';

// A plain `<a href="/api/.../download">` navigates to a response with
// Content-Disposition: attachment. Capacitor's WKWebView shell has no
// download delegate wired up (confirmed by reading
// node_modules/@capacitor/ios's WebViewDelegationHandler — no
// WKDownloadDelegate conformance), so that tap just silently fails
// inside the native app. Opening it through the in-app browser instead
// hands it to a real Safari context, which downloads/previews it
// normally. On the regular website this behaves like a plain link.
export default function DownloadLink({ href, children, onClick, ...rest }) {
  async function handleClick(e) {
    onClick?.(e);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) return;
      e.preventDefault();
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url: href });
    } catch {
      // Not running inside Capacitor — let the default <a> navigation happen.
    }
  }

  return (
    <a href={href} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
