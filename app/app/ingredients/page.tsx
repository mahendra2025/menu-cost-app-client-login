import { redirect } from 'next/navigation';

export default function RemovedIngredientsPage() {
  redirect('/app/event?resume=1');
}
