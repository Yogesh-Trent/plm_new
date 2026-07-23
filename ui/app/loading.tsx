export default function Loading() {
  return (
    <main
      className="workspace-route-state-v2 workspace-loading-v2"
      id="main-content"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <div className="workspace-state-brand-v2">TL</div>
      <div className="workspace-loading-copy-v2">
        <span />
        <span />
      </div>
      <div className="workspace-loading-grid-v2" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
