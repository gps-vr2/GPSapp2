import { Suspense } from 'react';
import ClientHomePage from './components/ClientHomePage';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ClientHomePage />
    </Suspense>
  );
}
