'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui';

export function MarkAllRead() {
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
      Mark all read
    </Button>
  );
}
