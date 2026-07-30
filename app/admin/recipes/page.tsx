import { redirect } from 'next/navigation';

export default function RecipesRedirectPage() {
  redirect('/admin/dishes#recipes');
}
