// ===== Research Angles =====
// Aligned to Revology Analytics' 4 service lines

import type { ResearchAngle, ResearchAngleId } from '../types/researchV2Types';

export const RESEARCH_ANGLES: Record<ResearchAngleId, ResearchAngle> = {
  margin_analytics: {
    id: 'margin_analytics',
    name: 'Margin & Pricing',
    icon: 'TrendingUp',
    description: 'Focus on pricing strategy, margin pressure, profit pools',
    service_line: 'Margin Analytics & Optimization',
    search_themes: [
      'pricing strategy',
      'margin pressure',
      'profit decline',
      'cost increases',
      'competitive pricing',
      'price war',
      'gross margin',
      'profitability',
      'price optimization',
      'pricing power',
      'margin erosion',
      'profit pool',
    ],
    pain_point_ids: [
      'profit-pool-blind',
      'cost-plus-trap',
      'margin-erosion',
      'price-complexity',
    ],
  },
  sales_growth: {
    id: 'sales_growth',
    name: 'Sales Effectiveness',
    icon: 'Users',
    description: 'Focus on sales productivity, customer analytics, pipeline',
    service_line: 'Sales Growth Analytics',
    search_themes: [
      'sales productivity',
      'customer analytics',
      'sales growth',
      'pipeline',
      'customer lifetime value',
      'sales performance',
      'revenue growth',
      'customer segmentation',
      'churn',
      'sales effectiveness',
      'quota attainment',
      'win rate',
    ],
    pain_point_ids: [
      'sales-blind',
      'customer-value-unknown',
      'churn-reactive',
      'territory-imbalance',
    ],
  },
  promo_effectiveness: {
    id: 'promo_effectiveness',
    name: 'Promotion & Trade',
    icon: 'Target',
    description: 'Focus on trade spend ROI, promo planning, retail partnerships',
    service_line: 'Promotion Effectiveness & Optimization',
    search_themes: [
      'trade spend',
      'promotion',
      'promotional activity',
      'retail partnership',
      'trade promotion',
      'promo ROI',
      'promotional effectiveness',
      'discount',
      'merchandising',
      'category management',
      'shopper marketing',
      'incremental lift',
    ],
    pain_point_ids: [
      'promo-roi-unknown',
      'trade-spend-black-hole',
      'cannibalization-blind',
      'promo-calendar-chaos',
    ],
  },
  analytics_transformation: {
    id: 'analytics_transformation',
    name: 'Analytics & Data',
    icon: 'Cpu',
    description: 'Focus on data maturity, dashboards, AI/ML readiness',
    service_line: 'Commercial Analytics Transformation',
    search_themes: [
      'digital transformation',
      'data analytics',
      'business intelligence',
      'AI implementation',
      'machine learning',
      'data strategy',
      'analytics platform',
      'dashboard',
      'data-driven',
      'data warehouse',
      'analytics maturity',
      'reporting automation',
    ],
    pain_point_ids: [
      'excel-hell',
      'data-silos',
      'reporting-lag',
      'ai-ready-not',
    ],
  },
};

// Helper to get all angles as array
export const RESEARCH_ANGLES_LIST = Object.values(RESEARCH_ANGLES);

// Helper to get angle by ID
export function getResearchAngle(id: ResearchAngleId): ResearchAngle {
  return RESEARCH_ANGLES[id];
}

// Helper to get search themes for an angle
export function getSearchThemesForAngle(id: ResearchAngleId): string[] {
  return RESEARCH_ANGLES[id]?.search_themes || [];
}
