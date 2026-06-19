import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

// Map kebab-case icon names to PascalCase component names
const iconNameMap: Record<string, string> = {
  "file-text": "FileText",
  "alert-circle": "AlertCircle",
  "alert-triangle": "AlertTriangle",
  "monitor": "Monitor",
  "monitor-x": "MonitorX",
  "user": "User",
  "user-plus": "UserPlus",
  "user-minus": "UserMinus",
  "user-cog": "UserCog",
  "users": "Users",
  "wifi": "Wifi",
  "smartphone": "Smartphone",
  "hard-drive": "HardDrive",
  "package": "Package",
  "package-plus": "PackagePlus",
  "key": "Key",
  "shield": "Shield",
  "lock": "Lock",
  "mail": "Mail",
  "message-circle": "MessageCircle",
  "search": "Search",
  "settings": "Settings",
  "wrench": "Wrench",
  "tool": "Wrench", // Fallback to Wrench
  "folder": "Folder",
  "file": "File",
  "file-plus": "FilePlus",
  "file-edit": "FileEdit",
  "clipboard": "Clipboard",
  "clipboard-list": "ClipboardList",
  "check-circle": "CheckCircle",
  "x-circle": "XCircle",
  "info": "Info",
  "help-circle": "HelpCircle",
  "clock": "Clock",
  "calendar": "Calendar",
  "globe": "Globe",
  "laptop": "Laptop",
  "server": "Server",
  "database": "Database",
  "cloud": "Cloud",
  "download": "Download",
  "upload": "Upload",
  "printer": "Printer",
  "headphones": "Headphones",
  "phone": "Phone",
  "video": "Video",
  "camera": "Camera",
  "image": "Image",
  "link": "Link",
  "refresh-cw": "RefreshCw",
  "zap": "Zap",
  "star": "Star",
  "heart": "Heart",
  "bookmark": "Bookmark",
  "tag": "Tag",
  "flag": "Flag",
  "home": "Home",
  "building": "Building",
  "briefcase": "Briefcase",
  "truck": "Truck",
  "credit-card": "CreditCard",
  "dollar-sign": "DollarSign",
  "plus": "Plus",
  "minus": "Minus",
  "x": "X",
  "check": "Check",
  "chevron-down": "ChevronDown",
  "chevron-up": "ChevronUp",
  "chevron-left": "ChevronLeft",
  "chevron-right": "ChevronRight",
  "arrow-left": "ArrowLeft",
  "arrow-right": "ArrowRight",
  "arrow-up": "ArrowUp",
  "arrow-down": "ArrowDown",
  "external-link": "ExternalLink",
  "layout-template": "LayoutTemplate",
  "layout-grid": "LayoutGrid",
  "list": "List",
  "grid": "Grid",
  "table": "Table",
  "bar-chart": "BarChart",
  "pie-chart": "PieChart",
  "activity": "Activity",
  "trending-up": "TrendingUp",
  "trending-down": "TrendingDown",
  "eye": "Eye",
  "eye-off": "EyeOff",
  "edit": "Edit",
  "trash": "Trash",
  "trash-2": "Trash2",
  "copy": "Copy",
  "scissors": "Scissors",
  "paperclip": "Paperclip",
  "send": "Send",
  "inbox": "Inbox",
  "archive": "Archive",
  "save": "Save",
  "log-out": "LogOut",
  "log-in": "LogIn",
  "more-horizontal": "MoreHorizontal",
  "more-vertical": "MoreVertical",
};

export function getLucideIcon(iconName: string): LucideIcon {
  // Try to get the icon from our map first
  const mappedName = iconNameMap[iconName];
  if (mappedName && (LucideIcons as any)[mappedName]) {
    return (LucideIcons as any)[mappedName];
  }

  // Try converting kebab-case to PascalCase
  const pascalCase = iconName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  if ((LucideIcons as any)[pascalCase]) {
    return (LucideIcons as any)[pascalCase];
  }

  // Fallback to FileText
  return LucideIcons.FileText;
}
