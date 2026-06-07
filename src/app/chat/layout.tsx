import type { Metadata } from 'next';

// Prevent Google from indexing the chat page or serving ads on it.
// The chat page is a private support interface that requires authentication
// and does not contain publisher content suitable for ad serving.
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

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
