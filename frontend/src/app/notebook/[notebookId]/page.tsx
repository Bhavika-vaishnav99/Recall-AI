import { Workspace } from '@/components/layout/Workspace';

export default function NotebookPage({
  params,
}: {
  params: { notebookId: string };
}) {
  return <Workspace notebookId={params.notebookId} />;
}
