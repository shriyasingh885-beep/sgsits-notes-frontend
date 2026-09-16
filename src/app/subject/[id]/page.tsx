import { redirect } from 'next/navigation';

export default function SubjectRedirect({ params }: { params: { id: string } }) {
  redirect(`/subjects/${params.id}`);
}
