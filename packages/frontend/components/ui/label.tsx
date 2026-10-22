import * as React from "react";
import { cn } from "@/lib/utils";

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children?: React.ReactNode;
  className?: string;
}

export function Label({ children, className, ...props }: LabelProps) {
  return (
    <label className={cn("block text-sm font-medium text-gray-700 mb-1", className)} {...props}>
      {children}
    </label>
  );
}
