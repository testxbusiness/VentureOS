"use client";

import { ReactNode, useState } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";

export default function Providers({ children }: { children: ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const [client] = useState(() => (url ? new ConvexReactClient(url) : null));

  if (!client) {
    return (
      <>
        <div style={{ padding: 12, background: "#ffedd5", borderBottom: "1px solid #fb923c" }}>
          Missing NEXT_PUBLIC_CONVEX_URL. Convex queries are disabled.
        </div>
        {children}
      </>
    );
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
