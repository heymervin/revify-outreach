import React from 'react';
import ResearchForm from '../components/ResearchForm';
import ResearchResults from '../components/ResearchResults';

const Dashboard: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Research & Intelligence</h1>
        <p className="text-slate-500 mt-1">Generate deep insights on target accounts in seconds.</p>
      </div>
      
      <ResearchForm />
      <ResearchResults />
    </div>
  );
};

export default Dashboard;