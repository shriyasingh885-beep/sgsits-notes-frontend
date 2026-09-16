'use client';

import SearchInput from '@/components/ui/SearchInput';
import Select from '@/components/ui/Select';

export default function SearchFilters({ update }: { update: (params: any) => void }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); const v = (e.currentTarget.elements.namedItem('q') as HTMLInputElement).value; update({ q: v }); }} className="flex gap-2">
      <SearchInput value="" onChange={() => {}} placeholder="Search..." name="q" />
      <Select>
        <option value="all">All</option>
      </Select>
    </form>
  );
}
