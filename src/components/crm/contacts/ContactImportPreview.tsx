import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, Check } from "lucide-react";

export interface ContactPreviewRow {
  contact_name: string;
  company_name: string;
  email: string;
  work_phone: string;
  mobile_phone: string;
  title: string;
  source: string;
  notes: string;
}

interface ContactImportPreviewProps {
  data: ContactPreviewRow[];
  onDataChange: (data: ContactPreviewRow[]) => void;
}

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email_campaign", label: "Email Campaign" },
  { value: "event", label: "Event" },
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "partner", label: "Partner" },
];

const getSourceLabel = (value: string) => {
  const option = SOURCE_OPTIONS.find((opt) => opt.value === value?.toLowerCase());
  return option?.label || "Select source";
};

const ContactImportPreview: React.FC<ContactImportPreviewProps> = ({
  data,
  onDataChange,
}) => {
  const handleSourceChange = (index: number, value: string) => {
    const newData = [...data];
    newData[index] = { ...newData[index], source: value };
    onDataChange(newData);
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Review and adjust the source values before importing.
        {data.length} contact{data.length !== 1 ? "s" : ""} found.
      </div>
      <ScrollArea className="h-[300px] rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Contact Name*</TableHead>
              <TableHead className="min-w-[100px]">Company</TableHead>
              <TableHead className="min-w-[150px]">Email</TableHead>
              <TableHead className="min-w-[100px]">Work Phone</TableHead>
              <TableHead className="min-w-[100px]">Mobile</TableHead>
              <TableHead className="min-w-[140px]">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow key={index}>
                <TableCell className={!row.contact_name?.trim() ? "text-destructive font-medium" : "font-medium"}>
                  {row.contact_name || "(missing)"}
                </TableCell>
                <TableCell>{row.company_name || "-"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.email || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.work_phone || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {row.mobile_phone || "-"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-[130px] justify-between"
                      >
                        {getSourceLabel(row.source)}
                        <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[130px] z-[100] bg-popover">
                      {SOURCE_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => handleSourceChange(index, option.value)}
                          className="justify-between"
                        >
                          {option.label}
                          {row.source?.toLowerCase() === option.value && (
                            <Check className="h-4 w-4" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default ContactImportPreview;
