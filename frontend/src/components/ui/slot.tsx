import * as React from "react";

import { cn } from "@/lib/utils";

/** Minimal Radix-style Slot: merges props/className onto its single child (avoids a Radix dependency). */
export function Slot({ children, className, ...props }: React.HTMLAttributes<HTMLElement>) {
  if (!React.isValidElement<React.HTMLAttributes<HTMLElement>>(children)) return null;
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    className: cn(className, children.props.className),
  });
}
