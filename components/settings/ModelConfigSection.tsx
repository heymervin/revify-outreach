'use client';

import { useState, useEffect } from 'react';
import { Zap, Save, Loader2, Check, AlertCircle, Eye, EyeOff, Sparkles } from 'lucide-react';

interface ModelConfig {
  news_signals_model: string;
  quick_research_model: string;
  standard_research_model: string;
  deep_research_model: string;
  email_drafting_model: string;
  web_scraping_service: string;
  has_serp_api_key: boolean;
}

const MODEL_OPTIONS = {
  news: [
    { value: 'serp-api', label: 'SERP API (Recommended)', description: 'Real-time news from Google' },
    { value: 'tavily', label: 'Tavily', description: 'Web search API' },
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Fast AI search' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', description: 'Advanced AI search' },
  ],
  research: [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash (Recommended)', description: 'Fast & efficient' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3 Pro', description: 'Higher quality, slower' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'OpenAI fast model' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'OpenAI advanced model' },
  ],
  scraping: [
    { value: 'tavily', label: 'Tavily (Recommended)', description: 'Best for web content' },
    { value: 'serp-api', label: 'SERP API', description: 'Alternative scraper' },
    { value: 'firecrawl', label: 'Firecrawl', description: 'Advanced crawler' },
  ],
};

export function ModelConfigSection() {
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [serpApiKey, setSerpApiKey] = useState('');
  const [showSerpKey, setShowSerpKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const res = await fetch('/api/models/config');
      if (!res.ok) throw new Error('Failed to fetch config');

      const data = await res.json();
      setConfig(data.config);
    } catch (error) {
      console.error('Failed to load model config:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    if (!config) return;

    setSaving(true);
    setMessage(null);

    try {
      const payload: Record<string, any> = {
        news_signals_model: config.news_signals_model,
        quick_research_model: config.quick_research_model,
        standard_research_model: config.standard_research_model,
        deep_research_model: config.deep_research_model,
        email_drafting_model: config.email_drafting_model,
        web_scraping_service: config.web_scraping_service,
      };

      // Only include SERP API key if it's been entered
      if (serpApiKey.trim()) {
        payload.serp_api_key = serpApiKey.trim();
      }

      const res = await fetch('/api/models/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save config');

      const data = await res.json();
      setConfig(data.config);
      setSerpApiKey(''); // Clear the input after saving
      setMessage({ type: 'success', text: 'Model configuration saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  }

  // Auto-dismiss message after 5 seconds
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [message]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <Check className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {message.text}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">AI Model Selection</p>
            <p className="text-blue-600">
              Choose which AI models to use for different operations. Faster models are cheaper but may be less accurate.
              Recommended settings are pre-selected.
            </p>
          </div>
        </div>
      </div>

      {/* SERP API Key */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">SERP API Key</h4>
            <p className="text-sm text-slate-500">Required for recent news and signals</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            {config.has_serp_api_key && !serpApiKey ? (
              <>
                <input
                  type="text"
                  value="••••••••••••••••"
                  disabled
                  className="input flex-1 bg-slate-100 text-slate-600 cursor-not-allowed"
                />
                <button
                  onClick={() => setSerpApiKey(' ')} // Trigger edit mode
                  className="btn-secondary px-4"
                >
                  Change
                </button>
              </>
            ) : (
              <>
                <div className="relative flex-1">
                  <input
                    type={showSerpKey ? 'text' : 'password'}
                    value={serpApiKey === ' ' ? '' : serpApiKey}
                    onChange={(e) => setSerpApiKey(e.target.value)}
                    placeholder="Enter your SERP API key"
                    className="input pr-10"
                    autoFocus={config.has_serp_api_key}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSerpKey(!showSerpKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showSerpKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {config.has_serp_api_key && (
                  <button
                    onClick={() => setSerpApiKey('')}
                    className="btn-secondary px-4"
                  >
                    Cancel
                  </button>
                )}
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Get your API key from{' '}
            <a
              href="https://serpapi.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-600 hover:text-teal-700 underline"
            >
              serpapi.com/dashboard
            </a>
          </p>
        </div>
      </div>

      {/* Model Configuration */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4">Model Selection by Operation</h4>

        <div className="space-y-6">
          {/* Recent News/Signals */}
          <div>
            <label className="label">Recent News & Signals</label>
            <select
              value={config.news_signals_model}
              onChange={(e) => setConfig({ ...config, news_signals_model: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.news.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Research */}
          <div>
            <label className="label">Quick Research Synthesis</label>
            <select
              value={config.quick_research_model}
              onChange={(e) => setConfig({ ...config, quick_research_model: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.research.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Standard Research */}
          <div>
            <label className="label">Standard Research Synthesis</label>
            <select
              value={config.standard_research_model}
              onChange={(e) => setConfig({ ...config, standard_research_model: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.research.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Deep Research */}
          <div>
            <label className="label">Deep Research & Synthesis</label>
            <select
              value={config.deep_research_model}
              onChange={(e) => setConfig({ ...config, deep_research_model: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.research.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Email Drafting */}
          <div>
            <label className="label">Email Drafting</label>
            <select
              value={config.email_drafting_model}
              onChange={(e) => setConfig({ ...config, email_drafting_model: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.research.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>

          {/* Web Scraping */}
          <div>
            <label className="label">Web Scraping/Crawling</label>
            <select
              value={config.web_scraping_service}
              onChange={(e) => setConfig({ ...config, web_scraping_service: e.target.value })}
              className="input"
            >
              {MODEL_OPTIONS.scraping.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveConfig}
        disabled={saving}
        className="btn-primary w-full disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Configuration
          </>
        )}
      </button>
    </div>
  );
}
