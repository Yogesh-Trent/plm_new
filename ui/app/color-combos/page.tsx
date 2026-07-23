import { WorkspaceFrame } from "@/app/components/WorkspaceFrame";
import { requireSession } from "@/lib/auth";
import { ColorCombosList } from "./ColorCombosList";

export default async function ColorCombosPage(props: {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}) {
  const session = await requireSession();
  const searchParams = await props.searchParams;
  const query = Array.isArray(searchParams.q)
    ? searchParams.q[0]
    : searchParams.q;
  const rawPage = Array.isArray(searchParams.page)
    ? searchParams.page[0]
    : searchParams.page;
  const page = Math.max(1, Number.parseInt(rawPage ?? "1", 10) || 1);

  return (
    <WorkspaceFrame session={session}>
      <ColorCombosList
        initialQuery={(query ?? "").trim()}
        initialOffset={(page - 1) * 20}
      />
    </WorkspaceFrame>
  );
}
