import { NotebookHome } from '@/components/home/NotebookHome';
import { RequireAuth } from '@/modules/auth/RequireAuth';

export default function Home() {
  return (
    <RequireAuth>
      <NotebookHome />
    </RequireAuth>
  );
}
