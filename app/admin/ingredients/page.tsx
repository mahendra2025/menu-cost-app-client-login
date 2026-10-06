import { redirect } from 'next/navigation';

export default function RemovedIngredientsPage() {
  redirect('/admin/dishes');
}
