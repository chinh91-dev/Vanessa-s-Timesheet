import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useContacts, useContactDealCounts, useDeleteContact } from "@/hooks/crm/useContacts";
import { useContactCategories } from "@/hooks/crm/useContactCategories";
import { Users, Plus, Search, Mail, Phone, Calendar, User, Upload, Briefcase, ArrowUpDown, Tag, Settings } from "lucide-react";
import { useState, useMemo } from "react";
import { formatDate } from "@/lib/crm/formatting";
import { canCreateContact, canManageContactCategories, canDeleteEntity } from "@/lib/crm/permissions";
import { useAuth } from "@/context/AuthContext";
import { ContactDialog } from "@/components/crm/contacts/ContactDialog";
import { ConvertContactToProspectDialog } from "@/components/crm/contacts/ConvertContactToProspectDialog";
import { ExistingCustomerDealDialog } from "@/components/crm/contacts/ExistingCustomerDealDialog";
import { ContactCategoryManagement } from "@/components/crm/contacts/ContactCategoryManagement";
import CSVImportDialog from "@/components/common/CSVImportDialog";
import type { Contact } from "@/lib/crm/types";
import { useQueryClient } from "@tanstack/react-query";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileContactCard from "@/components/crm/mobile/MobileContactCard";
import MobileFilterSheet from "@/components/common/MobileFilterSheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

export default function ContactsPage() {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { data: contacts, isLoading } = useContacts();
  const { data: dealCounts } = useContactDealCounts();
  const { data: categories } = useContactCategories();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(undefined);
  const [convertProspectOpen, setConvertProspectOpen] = useState(false);
  const [contactToConvertToProspect, setContactToConvertToProspect] = useState<Contact | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [existingCustomerDialogOpen, setExistingCustomerDialogOpen] = useState(false);
  const [categoryManagementOpen, setCategoryManagementOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    if (!contacts) return [];

    // Filter by search term
    let result = contacts.filter((contact) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        contact.contact_name?.toLowerCase().includes(searchLower) ||
        contact.company_name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.source?.toLowerCase().includes(searchLower)
      );
    });

    // Filter by categories
    if (selectedCategories.length > 0) {
      result = result.filter((contact) =>
        contact.categories?.some((cat) => selectedCategories.includes(cat.id))
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name_asc":
          return (a.contact_name || "").localeCompare(b.contact_name || "");
        case "name_desc":
          return (b.contact_name || "").localeCompare(a.contact_name || "");
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "newest":
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [contacts, searchTerm, selectedCategories, sortBy]);

  const canCreate = canCreateContact(userRole);
  const canManageCategories = canManageContactCategories(userRole);

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setDialogOpen(true);
  };

  const deleteContact = useDeleteContact();
  const handleDeleteContact = (contact: Contact) => {
    if (!canDeleteEntity(userRole)) return;
    const label = contact.contact_name || contact.company_name || "this contact";
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return;
    deleteContact.mutate(contact.id);
  };

  const toggleCategoryFilter = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setSortBy("newest");
  };

  const activeFilterCount = selectedCategories.length + (sortBy !== "newest" ? 1 : 0);

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case "name_asc": return "A to Z";
      case "name_desc": return "Z to A";
      case "oldest": return "Oldest";
      case "newest": return "Newest";
    }
  };

  // Render category badges on contact card
  const renderCategoryBadges = (contact: Contact, maxVisible = 2) => {
    if (!contact.categories || contact.categories.length === 0) return null;
    
    const visible = contact.categories.slice(0, maxVisible);
    const remaining = contact.categories.length - maxVisible;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {visible.map((cat) => (
          <Badge
            key={cat.id}
            variant="outline"
            className="text-xs px-1.5 py-0"
            style={{
              borderColor: cat.color,
              backgroundColor: `${cat.color}15`,
            }}
          >
            {cat.name}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs px-1.5 py-0">
            +{remaining}
          </Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">Manage active sales contacts</p>
        </div>
        {canCreate && (
          isMobile ? (
            <Button size="icon" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={() => setExistingCustomerDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                From Existing Customer
              </Button>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Contact
              </Button>
            </div>
          )
        )}
      </div>

      {/* Desktop Filter Bar */}
      {!isMobile && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name_asc">A to Z</SelectItem>
              <SelectItem value="name_desc">Z to A</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          {categories && categories.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Categories
                  {selectedCategories.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                      {selectedCategories.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[220px] p-2" align="end">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {categories.map((category) => (
                    <label
                      key={category.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedCategories.includes(category.id)}
                        onCheckedChange={() => toggleCategoryFilter(category.id)}
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
                {selectedCategories.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setSelectedCategories([])}
                  >
                    Clear
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}

          {/* Manage Categories Button */}
          {canManageCategories && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCategoryManagementOpen(true)}
              title="Manage Categories"
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Mobile Search and Filter */}
      {isMobile && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <MobileFilterSheet
            isOpen={mobileFilterOpen}
            onOpenChange={setMobileFilterOpen}
            onClearFilters={clearFilters}
            activeFilterCount={activeFilterCount}
          >
            <div className="space-y-6">
              {/* Sort Options */}
              <div className="space-y-3">
                <h3 className="font-medium">Sort By</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(["newest", "oldest", "name_asc", "name_desc"] as SortOption[]).map((option) => (
                    <Button
                      key={option}
                      variant={sortBy === option ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSortBy(option)}
                      className="w-full"
                    >
                      {getSortLabel(option)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              {categories && categories.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium">Categories</h3>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-3 p-3 rounded-md border cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => toggleCategoryFilter(category.id)}
                        />
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Manage Categories for Mobile */}
              {canManageCategories && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMobileFilterOpen(false);
                    setCategoryManagementOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Categories
                </Button>
              )}
            </div>
          </MobileFilterSheet>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      ) : filteredAndSortedContacts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contacts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchTerm || selectedCategories.length > 0 ? "Try adjusting your filters" : "Get started by creating your first contact"}
            </p>
            {canCreate && !searchTerm && selectedCategories.length === 0 && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Contact
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        isMobile ? (
          <div className="space-y-3">
            {filteredAndSortedContacts?.map((contact) => (
              <MobileContactCard
                key={contact.id}
                contact={contact}
                dealCount={dealCounts?.[contact.id]}
                onClick={() => handleEditContact(contact)}
                onCall={() => console.log('Call', contact.phone)}
                onEmail={() => console.log('Email', contact.email)}
                onEdit={() => handleEditContact(contact)}
                onDelete={canDeleteEntity(userRole) ? () => handleDeleteContact(contact) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredAndSortedContacts?.map((contact) => (
              <Card
                key={contact.id}
                className="hover:shadow-md transition-shadow cursor-pointer h-full"
                onClick={() => {
                  setSelectedContact(contact);
                  setDialogOpen(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {contact.company_name && (
                        <CardTitle className="text-lg mb-1 truncate">
                          {contact.company_name}
                        </CardTitle>
                      )}
                      {contact.contact_name && (
                        <p className="text-sm text-muted-foreground truncate">{contact.contact_name}</p>
                      )}
                      {renderCategoryBadges(contact)}
                    </div>
                    <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                      {dealCounts?.[contact.id] && dealCounts[contact.id] > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {dealCounts[contact.id]} deal{dealCounts[contact.id] > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {contact.email && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Phone className="mr-2 h-4 w-4 flex-shrink-0" />
                      {contact.phone}
                    </div>
                  )}
                  {contact.source && (
                    <div className="mt-2">
                      <Badge variant="outline" className="text-xs">
                        {contact.source}
                      </Badge>
                    </div>
                  )}
                  {contact.created_at && (
                    <div className="flex items-center text-xs text-muted-foreground pt-2">
                      <Calendar className="mr-1 h-3 w-3" />
                      Created {formatDate(contact.created_at)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      <ContactDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedContact(undefined);
        }}
        contact={selectedContact}
        canDelete={canDeleteEntity(userRole)}
        onConvertToProspect={(contact) => {
          setContactToConvertToProspect(contact);
          setConvertProspectOpen(true);
        }}
      />

      {contactToConvertToProspect && (
        <ConvertContactToProspectDialog
          open={convertProspectOpen}
          onClose={() => {
            setConvertProspectOpen(false);
            setContactToConvertToProspect(null);
          }}
          contact={contactToConvertToProspect}
        />
      )}

      <ExistingCustomerDealDialog
        open={existingCustomerDialogOpen}
        onClose={() => setExistingCustomerDialogOpen(false)}
      />

      <CSVImportDialog
        isOpen={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        entityType="contacts"
        onImportComplete={() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] });
        }}
      />

      <ContactCategoryManagement
        open={categoryManagementOpen}
        onClose={() => setCategoryManagementOpen(false)}
      />
    </div>
  );
}
