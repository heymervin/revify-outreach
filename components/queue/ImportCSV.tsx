'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ParsedRow {
  domain: string;
  name?: string;
  website?: string;
  industry?: string;
  [key: string]: string | undefined;
}

interface ImportCSVProps {
  onImport: (rows: ParsedRow[]) => void;
  loading?: boolean;
}

// Common column name mappings
const COLUMN_MAPPINGS: Record<string, string[]> = {
  domain: ['domain', 'company_domain', 'website_domain', 'url', 'site'],
  name: ['name', 'company_name', 'company', 'business_name', 'organization'],
  website: ['website', 'company_website', 'url', 'web', 'site'],
  industry: ['industry', 'sector', 'vertical', 'category', 'type'],
};

export function ImportCSV({ onImport, loading = false }: ImportCSVProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: ParsedRow[];
    mappings: Record<string, string>;
  } | null>(null);
  const [customMappings, setCustomMappings] = useState<Record<string, string>>({});

  const parseCSV = useCallback((text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

    // Parse data rows
    const rows = lines.slice(1).map((line) => {
      // Handle quoted values with commas
      const values: string[] = [];
      let current = '';
      let inQuotes = false;

      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      return values;
    });

    return { headers, rows };
  }, []);

  const autoMapColumns = useCallback(
    (headers: string[]): Record<string, string> => {
      const mappings: Record<string, string> = {};

      for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
        for (const alias of aliases) {
          const headerIndex = headers.findIndex(
            (h) => h.toLowerCase().includes(alias.toLowerCase())
          );
          if (headerIndex !== -1 && !Object.values(mappings).includes(headers[headerIndex])) {
            mappings[field] = headers[headerIndex];
            break;
          }
        }
      }

      return mappings;
    },
    []
  );

  const processFile = useCallback(
    async (file: File) => {
      setError(null);
      setPreview(null);

      if (!file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }

      try {
        const text = await file.text();
        const { headers, rows } = parseCSV(text);

        // Auto-map columns
        const mappings = autoMapColumns(headers);

        // Check if we have a domain mapping
        if (!mappings.domain) {
          setError('Could not find a domain column. Please map columns manually.');
        }

        // Convert rows to objects using mappings
        const parsedRows: ParsedRow[] = rows
          .map((row) => {
            const obj: ParsedRow = { domain: '' };
            for (const [field, header] of Object.entries(mappings)) {
              const index = headers.indexOf(header);
              if (index !== -1) {
                obj[field] = row[index]?.replace(/^"|"$/g, '') || undefined;
              }
            }
            return obj;
          })
          .filter((row) => row.domain); // Filter out rows without domain

        setPreview({
          headers,
          rows: parsedRows,
          mappings,
        });
        setCustomMappings(mappings);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV');
      }
    },
    [parseCSV, autoMapColumns]
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleMappingChange = (field: string, header: string) => {
    setCustomMappings((prev) => ({
      ...prev,
      [field]: header,
    }));
  };

  const handleImport = () => {
    if (!preview) return;

    // Re-parse with custom mappings
    const rows = preview.rows.map((row) => {
      const newRow: ParsedRow = { domain: '' };
      for (const [field, header] of Object.entries(customMappings)) {
        if (header && row[field]) {
          newRow[field] = row[field];
        }
      }
      return newRow;
    }).filter((row) => row.domain);

    onImport(rows);
    setPreview(null);
  };

  const handleCancel = () => {
    setPreview(null);
    setError(null);
    setCustomMappings({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card padding="md">
      <h3 className="font-semibold text-slate-900 mb-4">Import from CSV</h3>

      {!preview ? (
        <>
          {/* Drop zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
              transition-colors
              ${
                dragActive
                  ? 'border-teal-500 bg-teal-50'
                  : 'border-slate-300 hover:border-slate-400'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />

            <Upload
              className={`w-10 h-10 mx-auto mb-4 ${
                dragActive ? 'text-teal-500' : 'text-slate-400'
              }`}
            />
            <p className="text-slate-600 mb-2">
              Drag and drop a CSV file, or click to browse
            </p>
            <p className="text-xs text-slate-400">
              CSV should include columns for domain, name, industry (optional)
            </p>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-lg flex items-center gap-2 text-danger-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </>
      ) : (
        <>
          {/* Preview */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="flex items-center gap-4">
              <Badge variant="success" size="md">
                <FileSpreadsheet className="w-4 h-4 mr-1" />
                {preview.rows.length} rows found
              </Badge>
              <Badge variant="info" size="md">
                {preview.headers.length} columns
              </Badge>
            </div>

            {/* Column mappings */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Column Mapping</p>
              <div className="grid grid-cols-2 gap-3">
                {Object.keys(COLUMN_MAPPINGS).map((field) => (
                  <div key={field} className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 capitalize w-20">
                      {field}:
                    </span>
                    <div className="relative flex-1">
                      <select
                        value={customMappings[field] || ''}
                        onChange={(e) => handleMappingChange(field, e.target.value)}
                        className="w-full px-3 py-2 pr-8 text-sm border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">Not mapped</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {customMappings[field] && (
                      <Check className="w-4 h-4 text-success-500 flex-shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Preview table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                <span className="text-xs font-medium text-slate-500">Preview (first 5 rows)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Domain</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-slate-600">Industry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="px-3 py-2 text-slate-900">{row.domain || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.name || '-'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.industry || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={handleCancel} leftIcon={<X className="w-4 h-4" />}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={!customMappings.domain || loading}
                loading={loading}
                leftIcon={<Check className="w-4 h-4" />}
                className="flex-1"
              >
                Import {preview.rows.length} Companies
              </Button>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

export default ImportCSV;
