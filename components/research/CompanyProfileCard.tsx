import React from 'react';
import { CompanyProfile } from '../../types';
import { Building2, MapPin, Users, DollarSign, Briefcase, Target } from 'lucide-react';

interface Props {
  profile: CompanyProfile;
}

const CompanyProfileCard: React.FC<Props> = ({ profile }) => {
  const items = [
    { icon: Building2, label: 'Industry', value: `${profile.industry} / ${profile.sub_segment}` },
    { icon: DollarSign, label: 'Est. Revenue', value: profile.estimated_revenue },
    { icon: Users, label: 'Employees', value: profile.employee_count },
    { icon: Briefcase, label: 'Business Model', value: profile.business_model },
    { icon: MapPin, label: 'Headquarters', value: profile.headquarters },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <Building2 className="w-5 h-5 text-brand-600 mr-2" />
            {profile.confirmed_name}
          </h3>
          <p className="text-sm text-slate-500 mt-1">{profile.market_position}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start space-x-3">
            <item.icon className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
            <div>
              <span className="text-xs text-slate-500 block">{item.label}</span>
              <span className="text-sm text-slate-700 font-medium">{item.value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompanyProfileCard;
