import { Workspace } from '@/components/layout/Workspace';
import { RequireAuth } from '@/modules/auth/RequireAuth';

export default function NotebookPage({
  params,
}: {
  params: { notebookId: string };
}) {
  return (
    <RequireAuth>
      <Workspace notebookId={params.notebookId} />
    </RequireAuth>
  );
}
