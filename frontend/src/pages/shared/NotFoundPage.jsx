import Button from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export default function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <main className="not-found">
      <div>
        <h1>404</h1>
        <p>This page does not exist or you do not have access to it.</p>
        <Button variant="primary" to="/">
          Go to your dashboard
        </Button>
      </div>
    </main>
  );
}
