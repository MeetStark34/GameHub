'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui';

export function MarkAllRead({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={async () => {
        await fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        router.refresh();
      }}
    >
      {label}
    </Button>
  );
}
