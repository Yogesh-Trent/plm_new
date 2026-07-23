"use client";

import {
  ArrowClockwise,
  ArrowLeft,
  WarningCircle,
} from "@phosphor-icons/react";
import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      className="workspace-route-state-v2 workspace-error-v2"
      id="main-content"
    >
      <div className="workspace-state-brand-v2">TL</div>
      <div className="workspace-error-icon-v2">
        <WarningCircle size={26} />
      </div>
      <p className="workspace-kicker">Workspace interruption</p>
      <h1>We couldn’t load this product view.</h1>
      <p>
        Your saved data is unchanged. Try the request again, or return to your
        role overview.
      </p>
      <div>
        <button type="button" onClick={reset}>
          <ArrowClockwise size={17} /> Try again
        </button>
        <Link href="/">
          <ArrowLeft size={17} /> Return to overview
        </Link>
      </div>
    </main>
  );
}
