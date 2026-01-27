import React from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Building, ChevronRight, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';

const HistoryPage: React.FC = () => {
  const { sessions, setCurrentSession } = useApp();

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Research History</h1>
        <p className="text-slate-500 mt-1">Access your past company analyses and generated content.</p>
      </div>

      {sessions.length === 0 ? (
         <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">No research history found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {sessions.map((session) => (
              <li key={session.id} className="hover:bg-slate-50 transition-colors">
                <Link 
                  to="/research" 
                  onClick={() => setCurrentSession(session.id)}
                  className="block p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center border border-brand-100">
                        <Building className="w-6 h-6 text-brand-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{session.companyName}</h3>
                        <div className="flex items-center space-x-3 mt-1">
                          <span className="inline-flex items-center text-xs text-slate-500">
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(session.timestamp).toLocaleDateString()}
                          </span>
                           <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {session.industry}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      <div className="text-right hidden sm:block">
                        <span className="block text-xs text-slate-400 uppercase tracking-wide">Sentiment</span>
                        <span className={`text-sm font-bold ${
                          session.sentimentScore > 70 ? 'text-green-600' : 'text-slate-700'
                        }`}>
                          {session.sentimentScore}/100
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;