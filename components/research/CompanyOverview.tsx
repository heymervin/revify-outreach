'use client';

import { Building2, Globe, Users, DollarSign, MapPin, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ConfidenceBadge, getConfidenceLevel, normalizeConfidenceScore } from '@/components/ui/ConfidenceBadge';
import { type CompanyProfileV3, type ResearchConfidenceV3 } from '@/types/researchTypesV3';

interface CompanyOverviewProps {
  profile: CompanyProfileV3;
  confidence?: ResearchConfidenceV3;
  className?: string;
}

export function CompanyOverview({
  profile,
  confidence,
  className = '',
}: CompanyOverviewProps) {
  const confidenceScore = confidence?.overall_score
    ? normalizeConfidenceScore(confidence.overall_score)
    : undefined;
  const confidenceLevel = confidenceScore
    ? getConfidenceLevel(confidenceScore)
    : undefined;

  return (
    <Card padding="md" className={className}>
      <div className="flex items-start gap-4">
        {/* Company Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
          <Building2 className="w-7 h-7 text-slate-600" />
        </div>

        {/* Company Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-heading">
                {profile.confirmed_name}
              </h2>
              <p className="text-slate-600">{profile.industry}</p>
              {profile.sub_segment && (
                <span className="text-sm text-slate-500">{profile.sub_segment}</span>
              )}
            </div>

            {/* Confidence Badge */}
            {confidenceLevel && (
              <ConfidenceBadge
                level={confidenceLevel}
                score={confidenceScore}
                showScore
                size="md"
              />
            )}
          </div>

          {/* Ownership badge */}
          {profile.ownership_type && (
            <Badge variant="info" size="sm" className="mt-2">
              {profile.ownership_type}
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        {profile.estimated_revenue && (
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Revenue</span>
            </div>
            <p className="font-semibold text-slate-900 font-data">
              {profile.estimated_revenue}
            </p>
            {profile.revenue_source && (
              <p className="text-xs text-slate-400 mt-0.5">{profile.revenue_source}</p>
            )}
          </div>
        )}

        {profile.employee_count && (
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">Employees</span>
            </div>
            <p className="font-semibold text-slate-900 font-data">
              {profile.employee_count}
            </p>
          </div>
        )}

        {profile.headquarters && (
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">Headquarters</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">
              {profile.headquarters}
            </p>
          </div>
        )}

        {profile.founded_year && (
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Founded</span>
            </div>
            <p className="font-semibold text-slate-900 font-data">
              {profile.founded_year}
            </p>
          </div>
        )}

        {profile.website && (
          <div className="bg-slate-50 rounded-xl p-3">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <Globe className="w-4 h-4" />
              <span className="text-xs font-medium">Website</span>
            </div>
            <a
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-teal-600 hover:text-teal-700 truncate block"
            >
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}

        {profile.investors && profile.investors.length > 0 && (
          <div className="bg-slate-50 rounded-xl p-3 col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-slate-500 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Investors</span>
            </div>
            <p className="font-semibold text-slate-900 text-sm">
              {profile.investors.slice(0, 2).join(', ')}
              {profile.investors.length > 2 && ` +${profile.investors.length - 2}`}
            </p>
          </div>
        )}
      </div>

      {/* Business Model */}
      {profile.business_model && (
        <div className="mt-4 p-3 bg-slate-50 rounded-xl">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            Business Model
          </span>
          <p className="text-sm text-slate-700 mt-1">{profile.business_model}</p>
        </div>
      )}

      {/* Market Position */}
      {profile.market_position && (
        <div className="mt-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
          <span className="text-xs font-medium text-teal-600 uppercase tracking-wider">
            Market Position
          </span>
          <p className="text-sm text-teal-700 mt-1">{profile.market_position}</p>
        </div>
      )}
    </Card>
  );
}

export default CompanyOverview;
