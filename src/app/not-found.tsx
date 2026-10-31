import { ButtonLink } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <p className="font-mono text-sm text-muted">404</p>
      <h1 className="mt-1 font-display text-3xl font-bold">That square is empty.</h1>
      <p className="mt-2 text-muted">The page you were looking for does not exist.</p>
      <ButtonLink href="/" className="mt-6">Back to GameHub</ButtonLink>
    </div>
  );
}
