import type { Session } from "@/lib/auth";
import { WorkspaceShell } from "./WorkspaceShell";

type WorkspaceFrameProps = {
  session: Session;
  children: React.ReactNode;
  attentionCount?: number;
};

/** Shared frame for every authenticated, backend-backed product screen. */
export function WorkspaceFrame({
  session,
  children,
  attentionCount = 0,
}: WorkspaceFrameProps) {
  return (
    <WorkspaceShell
      role={session.role}
      userName={session.name}
      attentionCount={attentionCount}
    >
      <div id="main-content" className="backend-workspace-v2">
        {children}
      </div>
    </WorkspaceShell>
  );
}
