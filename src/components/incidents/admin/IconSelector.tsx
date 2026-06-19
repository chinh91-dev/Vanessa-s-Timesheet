import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getLucideIcon } from "@/lib/icon-utils";
import { cn } from "@/lib/utils";

const COMMON_ICONS = [
  "file-text",
  "alert-circle",
  "alert-triangle",
  "monitor",
  "monitor-x",
  "user",
  "user-plus",
  "user-minus",
  "user-cog",
  "users",
  "wifi",
  "smartphone",
  "hard-drive",
  "package",
  "package-plus",
  "key",
  "shield",
  "lock",
  "mail",
  "message-circle",
  "search",
  "settings",
  "wrench",
  "tool",
  "folder",
  "file",
  "file-plus",
  "file-edit",
  "clipboard",
  "clipboard-list",
  "check-circle",
  "x-circle",
  "info",
  "help-circle",
  "clock",
  "calendar",
  "globe",
  "laptop",
  "server",
  "database",
  "cloud",
  "download",
  "upload",
  "printer",
  "headphones",
  "phone",
  "video",
  "camera",
  "image",
  "link",
  "refresh-cw",
  "zap",
  "star",
  "heart",
  "bookmark",
  "tag",
  "flag",
  "home",
  "building",
  "briefcase",
  "truck",
  "credit-card",
  "dollar-sign",
];

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function IconSelector({ value, onChange }: IconSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const SelectedIcon = getLucideIcon(value);

  const filteredIcons = COMMON_ICONS.filter((icon) =>
    icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <SelectedIcon className="h-4 w-4" />
          <span className="flex-1 text-left">{value}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-6 gap-1 p-2">
            {filteredIcons.map((iconName) => {
              const IconComp = getLucideIcon(iconName);
              return (
                <Button
                  key={iconName}
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9",
                    value === iconName && "bg-primary/10 text-primary"
                  )}
                  onClick={() => {
                    onChange(iconName);
                    setOpen(false);
                  }}
                  title={iconName}
                >
                  <IconComp className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
