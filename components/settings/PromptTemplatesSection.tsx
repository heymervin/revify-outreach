import React, { useState } from 'react';
import { Plus, Trash2, Check, Eye, EyeOff, X } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { PromptTemplate } from '../../types';
import { extractTemplateVariables } from '../../utils/templateEngine';
import PromptPreview from './PromptPreview';

const PromptTemplatesSection: React.FC = () => {
  const {
    promptTemplates,
    updatePromptTemplate,
    deletePromptTemplate,
    setDefaultTemplate,
    addPromptTemplate
  } = useSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [newTemplate, setNewTemplate] = useState<{ type: 'research' | 'email'; name: string; content: string } | null>(null);

  const researchTemplates = promptTemplates.filter(t => t.type === 'research');
  const emailTemplates = promptTemplates.filter(t => t.type === 'email');

  const handleSaveNew = () => {
    if (!newTemplate || !newTemplate.name.trim() || !newTemplate.content.trim()) return;
    addPromptTemplate({
      name: newTemplate.name,
      type: newTemplate.type,
      content: newTemplate.content,
      variables: extractTemplateVariables(newTemplate.content),
      isDefault: false,
    });
    setNewTemplate(null);
  };

  const renderTemplateCard = (template: PromptTemplate) => (
    <div key={template.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-slate-900">{template.name}</span>
          {template.isDefault && (
            <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {!template.isDefault && (
            <button
              onClick={() => setDefaultTemplate(template.id)}
              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
              title="Set as active template"
            >
              <Check className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setPreviewId(previewId === template.id ? null : template.id)}
            className={`p-1.5 rounded transition-colors ${
              previewId === template.id
                ? 'text-brand-600 bg-brand-50'
                : 'text-slate-400 hover:text-brand-600 hover:bg-brand-50'
            }`}
            title="Preview with sample data"
          >
            {previewId === template.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {!template.id.startsWith('default-') && (
            <button
              onClick={() => {
                if (window.confirm('Delete this template?')) {
                  deletePromptTemplate(template.id);
                }
              }}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete template"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {editingId === template.id ? (
        <div className="p-4">
          <textarea
            value={template.content}
            onChange={(e) => updatePromptTemplate(template.id, {
              content: e.target.value,
              variables: extractTemplateVariables(e.target.value)
            })}
            className="w-full h-64 rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-3 border font-mono"
          />
          <div className="mt-3 flex justify-between items-center">
            <div className="text-xs text-slate-500">
              <span className="font-medium">Variables:</span> {template.variables.map(v => `{{${v}}}`).join(', ') || 'None detected'}
            </div>
            <button
              onClick={() => setEditingId(null)}
              className="text-sm text-brand-600 font-medium hover:text-brand-700"
            >
              Done Editing
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4">
          <pre className="text-sm text-slate-600 whitespace-pre-wrap max-h-32 overflow-auto font-mono bg-slate-50 p-3 rounded border border-slate-100">
            {template.content.length > 300 ? template.content.substring(0, 300) + '...' : template.content}
          </pre>
          <button
            onClick={() => setEditingId(template.id)}
            className="mt-3 text-sm text-brand-600 font-medium hover:text-brand-700"
          >
            Edit Template
          </button>
        </div>
      )}

      {previewId === template.id && (
        <PromptPreview template={template} />
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Prompt Templates</h3>
        <p className="text-sm text-slate-500">
          Customize the prompts used for research and email generation. Use <code className="bg-slate-100 px-1 rounded">{'{{variable}}'}</code> syntax for dynamic values.
        </p>
      </div>

      {/* Research Templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800">Research Prompts</h4>
          <button
            onClick={() => setNewTemplate({ type: 'research', name: '', content: '' })}
            className="text-xs text-brand-600 hover:text-brand-700 flex items-center font-medium"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Template
          </button>
        </div>
        <div className="space-y-4">
          {researchTemplates.map(renderTemplateCard)}
        </div>
      </div>

      {/* Email Templates */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-800">Email Prompts</h4>
          <button
            onClick={() => setNewTemplate({ type: 'email', name: '', content: '' })}
            className="text-xs text-brand-600 hover:text-brand-700 flex items-center font-medium"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Template
          </button>
        </div>
        <div className="space-y-4">
          {emailTemplates.map(renderTemplateCard)}
        </div>
      </div>

      {/* New Template Modal */}
      {newTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] overflow-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                New {newTemplate.type === 'research' ? 'Research' : 'Email'} Template
              </h3>
              <button
                onClick={() => setNewTemplate(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
                  placeholder="e.g., Aggressive Sales Pitch"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Prompt Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  className="w-full h-64 rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 text-sm p-3 border font-mono"
                  placeholder={`Use {{variable}} for dynamic values.\n\nAvailable variables for ${newTemplate.type}:\n${newTemplate.type === 'research' ? '{{company}}, {{industry}}, {{website}}' : '{{persona}}, {{company}}, {{brief}}, {{hypotheses}}'}`}
                />
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                <span className="font-medium">Available variables:</span>{' '}
                {newTemplate.type === 'research'
                  ? '{{company}}, {{industry}}, {{website}}'
                  : '{{persona}}, {{company}}, {{brief}}, {{hypotheses}}'}
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={() => setNewTemplate(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNew}
                disabled={!newTemplate.name.trim() || !newTemplate.content.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptTemplatesSection;
