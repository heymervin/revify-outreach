import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { generateResearch } from '../services/geminiService';
import { useApp } from '../context/AppContext';
import { v4 as uuidv4 } from 'uuid';

const ResearchForm: React.FC = () => {
  const { addSession } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    website: '',
    industry: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.companyName || !formData.industry) {
      setError('Company name and Industry are required');
      return;
    }
    
    setError('');
    setLoading(true);

    try {
      const result = await generateResearch(formData.companyName, formData.industry, formData.website);
      
      addSession({
        id: uuidv4(),
        timestamp: Date.now(),
        ...result
      });
      
      // Reset form (optional, depending on UX preference)
      setFormData({ companyName: '', website: '', industry: '' });
    } catch (err) {
      console.error(err);
      setError('Failed to generate research. Please check your API key or try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">New Research Session</h2>
        <p className="text-slate-500 text-sm">Enter company details to generate AI-powered insights.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
              placeholder="e.g. Acme Corp"
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Industry</label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
              placeholder="e.g. SaaS, Retail"
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website (Optional)</label>
            <input
              type="text"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
              className="w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2.5 border"
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="-ml-1 mr-2 h-4 w-4" />
                Start Research
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ResearchForm;