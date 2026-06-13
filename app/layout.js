import './globals.css';

export const metadata = {
  title: 'DXE Solutions | Civil Engineering & Project Management',
  description:
    'DXE Solutions manages every non-structural dimension of your residential or commercial construction project — permitting, inspections, stakeholder coordination, scheduling, document control, and project close-out.',
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
      <body>{children}</body>
    </html>
  );
}
