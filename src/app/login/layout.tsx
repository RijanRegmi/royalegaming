import type { Metadata } from 'next';

// Prevent Google from indexing the login page or serving ads on it.
// The login page is a pure authentication form with no publisher content.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
