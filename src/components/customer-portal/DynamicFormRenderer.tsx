import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface DynamicFormRendererProps {
  fields: FormField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
}

export function DynamicFormRenderer({ fields, values, onChange }: DynamicFormRendererProps) {
  if (!fields || fields.length === 0) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="summary">Summary *</Label>
          <Input
            id="summary"
            value={values.summary || ''}
            onChange={(e) => onChange('summary', e.target.value)}
            placeholder="Brief description of the issue"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={values.description || ''}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder="Please provide detailed information"
            rows={5}
          />
        </div>
        <div className="space-y-2">
          <Label>Attachment</Label>
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center">
            <p className="text-muted-foreground mb-3">Drag and drop files, paste screenshots, or browse</p>
            <label htmlFor="attachment-upload" className="cursor-pointer">
              <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
                Browse
              </span>
              <Input
                id="attachment-upload"
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onChange('attachment', file.name);
                  }
                }}
              />
            </label>
            {values.attachment && (
              <p className="text-sm text-muted-foreground mt-2">Selected: {values.attachment}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const isRequired = field.required;
        const fieldId = `field-${field.name}`;

        switch (field.type) {
          case 'text':
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={fieldId}>
                  {field.label} {isRequired && '*'}
                </Label>
                <Input
                  id={fieldId}
                  value={values[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  required={isRequired}
                />
              </div>
            );

          case 'richtext':
          case 'textarea':
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={fieldId}>
                  {field.label} {isRequired && '*'}
                </Label>
                <Textarea
                  id={fieldId}
                  value={values[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  rows={5}
                  required={isRequired}
                />
              </div>
            );

          case 'file':
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={fieldId}>
                  {field.label} {isRequired && '*'}
                </Label>
                <Input
                  id={fieldId}
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onChange(field.name, file.name);
                    }
                  }}
                  required={isRequired}
                />
              </div>
            );

          default:
            return (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={fieldId}>
                  {field.label} {isRequired && '*'}
                </Label>
                <Input
                  id={fieldId}
                  value={values[field.name] || ''}
                  onChange={(e) => onChange(field.name, e.target.value)}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  required={isRequired}
                />
              </div>
            );
        }
      })}
    </div>
  );
}
