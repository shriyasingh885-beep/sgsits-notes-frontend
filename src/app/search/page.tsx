import { redirect } from 'next/navigation';

export default function SearchRedirect({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === 'string') {
      params.set(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => params.append(key, v));
    }
  }
  const qs = params.toString();
  redirect(qs ? `/notes?${qs}` : '/notes');
}
