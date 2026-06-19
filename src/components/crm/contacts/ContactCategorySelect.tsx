import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Tag } from "lucide-react";
import { useContactCategories, type ContactCategory } from "@/hooks/crm/useContactCategories";
import { cn } from "@/lib/utils";

interface ContactCategorySelectProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ContactCategorySelect({
  selectedIds,
  onChange,
  disabled = false,
  className,
}: ContactCategorySelectProps) {
  const { data: categories, isLoading } = useContactCategories();

  const toggleCategory = (categoryId: string) => {
    if (selectedIds.includes(categoryId)) {
      onChange(selectedIds.filter(id => id !== categoryId));
    } else {
      onChange([...selectedIds, categoryId]);
    }
  };

  const selectedCategories = categories?.filter(c => selectedIds.includes(c.id)) || [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-full justify-between min-h-[40px] h-auto",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {selectedCategories.length === 0 ? (
              <span className="text-muted-foreground">Select categories...</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {selectedCategories.map(cat => (
                  <Badge
                    key={cat.id}
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: cat.color,
                      backgroundColor: `${cat.color}20`,
                    }}
                  >
                    {cat.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-2" align="start">
        {isLoading ? (
          <p className="text-sm text-muted-foreground p-2">Loading categories...</p>
        ) : categories?.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2">No categories available</p>
        ) : (
          <div className="space-y-1 max-h-[200px] overflow-y-auto">
            {categories?.map((category) => (
              <label
                key={category.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={selectedIds.includes(category.id)}
                  onCheckedChange={() => toggleCategory(category.id)}
                />
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
              </label>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
