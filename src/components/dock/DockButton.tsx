"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function DockButton({ tooltip, ...props }: Omit<ComponentProps<typeof Button>, "title"> & { tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} />
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8} lang="en" className="z-[90] max-w-72 text-center">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
