import type { Metadata } from 'next';
import { AuthPage } from '@/features/auth/auth-page';

export const metadata: Metadata = { title: 'Create your account', robots: { index: false, follow: true } };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
