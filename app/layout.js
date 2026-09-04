import './globals.css';
import CapacitorInit from '@/components/CapacitorInit';

export const metadata = {
  title: 'DXE Solutions | Permitting & Project Management',
  description:
    'DXE Solutions manages every non-structural dimension of your residential or commercial construction project — permitting, inspections, stakeholder coordination, scheduling, document control, and project close-out.',
};

// viewportFit: 'cover' is what makes env(safe-area-inset-*) resolve to
// real values instead of 0 — required for the iOS app shell, where the
// webview renders edge-to-edge under the status bar/notch.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/dist/tabler-icons.min.css"
        />
      </head>
      <body>
        <CapacitorInit />
        {children}
      </body>
    </html>
  );
}
