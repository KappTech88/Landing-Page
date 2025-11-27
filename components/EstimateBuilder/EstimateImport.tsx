/**
 * EstimateImport Component
 * Handles Excel file upload, preview, and import into EstimateBuilder
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileSpreadsheet, X, Check, AlertCircle, AlertTriangle,
  ChevronDown, ChevronUp, Download, Eye, FileText, Trash2,
  ArrowRight, RefreshCw, Info, CheckCircle2
} from 'lucide-react';
import {
  parseExcelFromFile,
  convertToEstimateBuilderFormat,
  getUniqueCategories,
  downloadTemplate,
  type ExcelParseResult,
  type ParsedExcelLineItem,
  type ParsedEstimateSummary
} from '../../services/excelService';

// ============= TYPES =============

interface EstimateImportProps {
  onImport: (lineItems: ReturnType<typeof convertToEstimateBuilderFormat>, categories: ReturnType<typeof getUniqueCategories>) => void;
  onClose: () => void;
  existingItemCount?: number;
}

type ImportMode = 'replace' | 'append';

// ============= HELPER FUNCTIONS =============

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

const formatNumber = (num: number) =>
  new Intl.NumberFormat('en-US').format(num);

// ============= SUB-COMPONENTS =============

interface DropZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

const DropZone: React.FC<DropZoneProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.match(/\.(xlsx|xls|csv)$/i)) {
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
        ${isDragging
          ? 'border-cyan-400 bg-cyan-400/10'
          : 'border-white/20 hover:border-cyan-400/50 hover:bg-white/5'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        <div className={`
          p-4 rounded-full transition-colors duration-300
          ${isDragging ? 'bg-cyan-400/20' : 'bg-white/10'}
        `}>
          {isLoading ? (
            <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-10 h-10 text-cyan-400" />
          )}
        </div>

        <div>
          <p className="text-white font-medium text-lg">
            {isLoading ? 'Parsing Excel file...' : 'Drop your Excel file here'}
          </p>
          <p className="text-gray-400 text-sm mt-1">
            or{' '}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-cyan-400 hover:text-cyan-300 underline"
              disabled={isLoading}
            >
              browse files
            </button>
          </p>
          <p className="text-gray-500 text-xs mt-3">
            Supports .xlsx, .xls, and .csv files
          </p>
        </div>
      </div>
    </div>
  );
};

interface SummaryCardProps {
  summary: ParsedEstimateSummary;
  metadata: ExcelParseResult['metadata'];
}

const SummaryCard: React.FC<SummaryCardProps> = ({ summary, metadata }) => {
  const [showCategories, setShowCategories] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">File Parsed Successfully</h3>
              <p className="text-gray-400 text-sm">{metadata.fileName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{formatNumber(summary.totalLineItems)}</p>
            <p className="text-gray-400 text-sm">Line Items</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total RCV</p>
          <p className="text-xl font-semibold text-white mt-1">{formatCurrency(summary.totalRCV)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Total ACV</p>
          <p className="text-xl font-semibold text-cyan-400 mt-1">{formatCurrency(summary.totalACV)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Depreciation</p>
          <p className="text-xl font-semibold text-amber-400 mt-1">{formatCurrency(summary.totalDepreciation)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Categories</p>
          <p className="text-xl font-semibold text-purple-400 mt-1">{summary.categorySummary.length}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="border-t border-white/10">
        <button
          onClick={() => setShowCategories(!showCategories)}
          className="w-full p-3 flex items-center justify-between text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <span className="text-sm font-medium">Category Breakdown</span>
          {showCategories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <AnimatePresence>
          {showCategories && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 pt-0 space-y-2">
                {summary.categorySummary.map((cat) => (
                  <div key={cat.code} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-mono text-cyan-400">
                        {cat.code}
                      </span>
                      <span className="text-gray-300">{cat.name}</span>
                      <span className="text-gray-500">({cat.itemCount} items)</span>
                    </div>
                    <span className="text-white font-medium">{formatCurrency(cat.totalRCV)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Warnings/Errors */}
      {(summary.parseErrors.length > 0 || summary.parseWarnings.length > 0) && (
        <div className="border-t border-white/10 p-4">
          {summary.parseErrors.filter(e => e.severity === 'error').length > 0 && (
            <div className="flex items-start gap-2 text-red-400 text-sm mb-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{summary.parseErrors.filter(e => e.severity === 'error').length} error(s) during parsing</span>
            </div>
          )}
          {summary.parseWarnings.length > 0 && (
            <div className="flex items-start gap-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{summary.parseWarnings.length} warning(s) - some data may be incomplete</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface LineItemPreviewProps {
  items: ParsedExcelLineItem[];
  maxItems?: number;
}

const LineItemPreview: React.FC<LineItemPreviewProps> = ({ items, maxItems = 10 }) => {
  const [showAll, setShowAll] = useState(false);
  const displayItems = showAll ? items : items.slice(0, maxItems);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4 text-cyan-400" />
          Preview Line Items
        </h3>
        <span className="text-gray-400 text-sm">
          Showing {displayItems.length} of {items.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/50 text-gray-400 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Activity</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-center">Unit</th>
              <th className="px-4 py-3 text-right">RCV</th>
              <th className="px-4 py-3 text-right">Dep %</th>
              <th className="px-4 py-3 text-right">ACV</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {displayItems.map((item, index) => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 text-gray-400">{item.lineNumber}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-cyan-400/20 rounded text-xs font-mono text-cyan-400">
                    {item.categoryCode}
                  </span>
                </td>
                <td className="px-4 py-3 text-white max-w-xs truncate">{item.description}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    item.activity === 'Remove' ? 'bg-red-500/20 text-red-400' :
                    item.activity === 'Remove and Replace' ? 'bg-amber-500/20 text-amber-400' :
                    item.activity === 'Detach & Reset' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-green-500/20 text-green-400'
                  }`}>
                    {item.activity}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-white">{formatNumber(item.quantity)}</td>
                <td className="px-4 py-3 text-center text-gray-400">{item.unit}</td>
                <td className="px-4 py-3 text-right text-white">{formatCurrency(item.rcv)}</td>
                <td className="px-4 py-3 text-right text-amber-400">{item.depreciationPercent.toFixed(1)}%</td>
                <td className="px-4 py-3 text-right text-cyan-400">{formatCurrency(item.acv)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {items.length > maxItems && (
        <div className="p-3 border-t border-white/10 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            {showAll ? 'Show Less' : `Show All ${items.length} Items`}
          </button>
        </div>
      )}
    </div>
  );
};

// ============= MAIN COMPONENT =============

const EstimateImport: React.FC<EstimateImportProps> = ({
  onImport,
  onClose,
  existingItemCount = 0
}) => {
  const [parseResult, setParseResult] = useState<ExcelParseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>('replace');

  const handleFileSelect = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setParseResult(null);

    try {
      const result = await parseExcelFromFile(file);
      setParseResult(result);

      if (!result.success) {
        const errorMessages = result.summary.parseErrors
          .filter(e => e.severity === 'error')
          .map(e => e.message)
          .join('; ');
        setError(errorMessages || 'Failed to parse Excel file');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (!parseResult || parseResult.lineItems.length === 0) return;

    const lineItems = convertToEstimateBuilderFormat(parseResult.lineItems);
    const categories = getUniqueCategories(parseResult.lineItems);

    onImport(lineItems, categories);
    onClose();
  }, [parseResult, onImport, onClose]);

  const handleReset = useCallback(() => {
    setParseResult(null);
    setError(null);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-cyan-400" />
              Import Estimate from Excel
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Upload a Xactimate export or custom estimate spreadsheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Drop Zone */}
          {!parseResult && (
            <>
              <DropZone onFileSelect={handleFileSelect} isLoading={isLoading} />

              {/* Template Download */}
              <div className="flex items-center justify-center gap-2 text-sm">
                <Info className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Need a template?</span>
                <button
                  onClick={() => downloadTemplate()}
                  className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Download Excel Template
                </button>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-red-400 font-medium">Error Parsing File</h4>
                <p className="text-red-300/80 text-sm mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Parse Results */}
          {parseResult && parseResult.success && (
            <>
              {/* Summary */}
              <SummaryCard summary={parseResult.summary} metadata={parseResult.metadata} />

              {/* Line Items Preview */}
              <LineItemPreview items={parseResult.lineItems} />

              {/* Import Options */}
              {existingItemCount > 0 && (
                <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4">
                  <h4 className="text-white font-medium mb-3">Import Mode</h4>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="w-4 h-4 text-cyan-400 bg-slate-700 border-white/20 focus:ring-cyan-400"
                      />
                      <span className="text-gray-300">Replace existing items ({existingItemCount} items)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="importMode"
                        value="append"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="w-4 h-4 text-cyan-400 bg-slate-700 border-white/20 focus:ring-cyan-400"
                      />
                      <span className="text-gray-300">Append to existing items</span>
                    </label>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex items-center justify-between shrink-0 bg-slate-900/50">
          <div>
            {parseResult && (
              <button
                onClick={handleReset}
                className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                Clear & Upload New File
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!parseResult || !parseResult.success || parseResult.lineItems.length === 0}
              className={`
                px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-all
                ${parseResult && parseResult.success && parseResult.lineItems.length > 0
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/25'
                  : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              Import {parseResult?.lineItems.length || 0} Items
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default EstimateImport;
