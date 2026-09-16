import { redirect } from 'next/navigation';

export default function ResourceRedirect({ params }: { params: { id: string } }) {
  redirect(`/notes/${params.id}`);
}
