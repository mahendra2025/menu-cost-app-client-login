import { redirect } from 'next/navigation';

export default function RemovedClientAccountsPage() {
  redirect('/app/event?resume=1');
}
