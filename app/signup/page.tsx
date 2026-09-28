import { redirect } from 'next/navigation';

export default function SignupRemovedPage() {
  redirect('/login');
}
