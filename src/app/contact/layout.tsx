// The contact page is a client component, so its metadata lives here.
export const metadata = {
  title: 'Contact',
  description: 'Get in touch with Spencer Wozniak: email, LinkedIn, or book a call.',
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
