// ===== Pain Point Library =====
// Curated pain points with trigger signals for hypothesis matching

import type { PainPoint, ResearchAngleId } from '../types/researchV2Types';

export const PAIN_POINT_LIBRARY: PainPoint[] = [
  // ===== MARGIN & PRICING =====
  {
    id: 'profit-pool-blind',
    name: 'Profit Pool Blindspot',
    category: 'margin_analytics',
    description: 'Cannot identify which products, customers, or channels actually drive profitability',
    trigger_signals: [
      { pattern: 'margin (pressure|compression|decline)', weight: 0.8 },
      { pattern: 'revenue.*grow.*profit.*(decline|flat)', weight: 0.9 },
      { pattern: 'cost allocation', weight: 0.6 },
      { pattern: 'profitability (analysis|visibility)', weight: 0.7 },
      { pattern: 'SKU rationalization', weight: 0.8 },
      { pattern: 'product mix', weight: 0.6 },
      { pattern: 'profit pool', weight: 0.9 },
    ],
    hypothesis_template:
      '{{company}} likely lacks granular visibility into profit pools across {{dimension}}. In similar {{industry}} companies, we typically find 20-30% of SKUs/customers destroy value while subsidized by top performers.',
    dimensions: ['products', 'customers', 'channels', 'regions'],
    discovery_questions: [
      'How do you currently measure profitability by product/customer?',
      'When did you last rationalize your SKU portfolio?',
      'Do you know your top 10 most profitable vs least profitable customers?',
    ],
    primary_personas: ['cfo_finance', 'pricing_rgm'],
    secondary_personas: ['ceo_gm'],
    industries: ['CPG', 'Manufacturing', 'Distribution', 'Retail'],
  },
  {
    id: 'cost-plus-trap',
    name: 'Cost-Plus Pricing Trap',
    category: 'margin_analytics',
    description: 'Pricing based on cost-plus markup rather than value or market dynamics',
    trigger_signals: [
      { pattern: 'cost.*(increase|pressure|inflation)', weight: 0.7 },
      { pattern: 'pricing (strategy|approach)', weight: 0.5 },
      { pattern: 'competitive (pricing|pressure)', weight: 0.7 },
      { pattern: 'price (war|competition)', weight: 0.8 },
      { pattern: 'commoditiz', weight: 0.8 },
      { pattern: 'pricing power', weight: 0.7 },
    ],
    hypothesis_template:
      '{{company}} may be using cost-plus pricing in a market where competitors are pricing to value. This typically leaves 5-15% margin on the table in {{industry}}.',
    dimensions: ['pricing methodology', 'competitive position'],
    discovery_questions: [
      'How do you set prices for new products?',
      'When did you last do a competitive pricing analysis?',
      'How do you measure willingness-to-pay?',
    ],
    primary_personas: ['pricing_rgm', 'cfo_finance'],
    secondary_personas: ['sales_commercial'],
    industries: ['Manufacturing', 'Distribution', 'B2B Services'],
  },
  {
    id: 'margin-erosion',
    name: 'Margin Erosion',
    category: 'margin_analytics',
    description: 'Gradual decline in margins without clear understanding of root causes',
    trigger_signals: [
      { pattern: 'margin (erosion|decline|shrink)', weight: 0.9 },
      { pattern: 'gross (margin|profit).*declin', weight: 0.85 },
      { pattern: 'operating margin.*pressure', weight: 0.8 },
      { pattern: 'input cost.*increas', weight: 0.6 },
      { pattern: 'unable to pass.*cost', weight: 0.85 },
    ],
    hypothesis_template:
      '{{company}} appears to be experiencing margin erosion, potentially from a combination of input cost increases and pricing constraints. In {{industry}}, this often signals an opportunity to optimize the pricing architecture.',
    dimensions: ['cost structure', 'pricing architecture', 'value chain'],
    discovery_questions: [
      'What has been your margin trend over the past 3 years?',
      'How successfully have you passed through cost increases?',
      'Do you have visibility into margin by product line?',
    ],
    primary_personas: ['cfo_finance', 'ceo_gm'],
    secondary_personas: ['pricing_rgm'],
    industries: [],
  },
  {
    id: 'price-complexity',
    name: 'Pricing Complexity Overload',
    category: 'margin_analytics',
    description: 'Too many pricing tiers, exceptions, and discounts making pricing unmanageable',
    trigger_signals: [
      { pattern: 'discount (management|leakage|governance)', weight: 0.9 },
      { pattern: 'pricing (complexity|simplification)', weight: 0.85 },
      { pattern: 'rebate (program|management)', weight: 0.7 },
      { pattern: 'contract (pricing|management)', weight: 0.6 },
      { pattern: 'price (exception|override)', weight: 0.8 },
    ],
    hypothesis_template:
      "{{company}}'s pricing structure may have grown too complex to manage effectively. In {{industry}}, companies with 1000+ price points typically have 5-8% margin leakage through uncontrolled discounting.",
    dimensions: ['price tiers', 'discount structure', 'contract terms'],
    discovery_questions: [
      'How many active price points do you maintain?',
      'What percentage of deals require custom pricing approval?',
      'How do you track discount effectiveness across the sales team?',
    ],
    primary_personas: ['pricing_rgm', 'sales_commercial'],
    secondary_personas: ['cfo_finance'],
    industries: ['Manufacturing', 'Distribution', 'B2B'],
  },

  // ===== SALES GROWTH =====
  {
    id: 'sales-blind',
    name: 'Sales Performance Blindspot',
    category: 'sales_growth',
    description: 'Lack of visibility into what drives sales rep success',
    trigger_signals: [
      { pattern: 'sales (growth|decline|performance)', weight: 0.7 },
      { pattern: 'revenue (miss|shortfall|pressure)', weight: 0.85 },
      { pattern: 'sales (transformation|effectiveness)', weight: 0.8 },
      { pattern: 'quota (attainment|miss)', weight: 0.9 },
      { pattern: 'sales productivity', weight: 0.85 },
    ],
    hypothesis_template:
      '{{company}} likely lacks comprehensive visibility into sales rep performance drivers. In {{industry}}, top performers often have different behaviors that are hard to identify without advanced analytics.',
    dimensions: ['rep performance', 'pipeline health', 'win/loss analysis'],
    discovery_questions: [
      'How do you identify what top performers do differently?',
      'What is your average win rate by segment?',
      'How do you forecast with confidence?',
    ],
    primary_personas: ['sales_commercial'],
    secondary_personas: ['ceo_gm', 'technology_analytics'],
    industries: [],
  },
  {
    id: 'customer-value-unknown',
    name: 'Customer Value Unknown',
    category: 'sales_growth',
    description: 'No visibility into customer lifetime value or profitability by customer segment',
    trigger_signals: [
      { pattern: 'customer (analytics|segmentation)', weight: 0.8 },
      { pattern: 'customer (acquisition|retention)', weight: 0.7 },
      { pattern: 'churn', weight: 0.8 },
      { pattern: 'customer lifetime', weight: 0.9 },
      { pattern: 'customer profitability', weight: 0.9 },
      { pattern: 'customer (value|CLV|LTV)', weight: 0.85 },
    ],
    hypothesis_template:
      '{{company}} likely treats all customers similarly despite significant variation in lifetime value. In {{industry}}, we typically find the top 20% of customers drive 80%+ of profits, but sales resources are allocated evenly.',
    dimensions: ['customers', 'segments', 'channels'],
    discovery_questions: [
      'How do you segment your customer base?',
      'Do you know customer lifetime value by segment?',
      'How do you prioritize sales resources across customers?',
    ],
    primary_personas: ['sales_commercial', 'cfo_finance'],
    secondary_personas: ['ceo_gm'],
    industries: ['Distribution', 'Manufacturing', 'B2B Services', 'Retail'],
  },
  {
    id: 'churn-reactive',
    name: 'Reactive Churn Management',
    category: 'sales_growth',
    description: 'Only addressing customer churn after customers have already decided to leave',
    trigger_signals: [
      { pattern: 'customer (churn|attrition|loss)', weight: 0.9 },
      { pattern: 'retention (rate|issue|challenge)', weight: 0.85 },
      { pattern: 'customer (loyalty|satisfaction)', weight: 0.6 },
      { pattern: 'NPS|net promoter', weight: 0.5 },
      { pattern: 'win.?back', weight: 0.7 },
    ],
    hypothesis_template:
      '{{company}} may be managing churn reactively rather than predictively. In {{industry}}, predictive churn models typically identify at-risk customers 3-6 months before they leave, enabling proactive intervention.',
    dimensions: ['churn drivers', 'early warning signals', 'retention programs'],
    discovery_questions: [
      'What is your current customer churn rate?',
      'Can you predict which customers are at risk of leaving?',
      'What retention programs do you have in place?',
    ],
    primary_personas: ['sales_commercial', 'technology_analytics'],
    secondary_personas: ['ceo_gm'],
    industries: [],
  },
  {
    id: 'territory-imbalance',
    name: 'Territory Imbalance',
    category: 'sales_growth',
    description: 'Uneven territory design leading to missed opportunities and rep burnout',
    trigger_signals: [
      { pattern: 'territory (design|optimization|imbalance)', weight: 0.9 },
      { pattern: 'sales coverage', weight: 0.7 },
      { pattern: 'quota (setting|allocation)', weight: 0.6 },
      { pattern: 'sales (capacity|bandwidth)', weight: 0.65 },
      { pattern: 'market potential', weight: 0.5 },
    ],
    hypothesis_template:
      "{{company}}'s territories may be imbalanced, with some reps overwhelmed and others underutilized. In {{industry}}, optimized territory design typically improves sales productivity by 10-15%.",
    dimensions: ['territory coverage', 'workload balance', 'market potential'],
    discovery_questions: [
      'How do you design sales territories?',
      'Is quota attainment consistent across territories?',
      'Do you size territories based on market potential?',
    ],
    primary_personas: ['sales_commercial'],
    secondary_personas: ['ceo_gm'],
    industries: ['Distribution', 'Manufacturing', 'B2B'],
  },

  // ===== PROMOTION EFFECTIVENESS =====
  {
    id: 'promo-roi-unknown',
    name: 'Promotion ROI Unknown',
    category: 'promo_effectiveness',
    description: 'Running promotions without measuring true incremental lift or cannibalization',
    trigger_signals: [
      { pattern: 'trade spend', weight: 0.9 },
      { pattern: 'promoti(on|onal)', weight: 0.7 },
      { pattern: 'retail(er)? partner', weight: 0.6 },
      { pattern: 'discount', weight: 0.5 },
      { pattern: 'merchandis', weight: 0.6 },
      { pattern: 'promotional (effectiveness|ROI|lift)', weight: 0.95 },
    ],
    hypothesis_template:
      '{{company}} likely invests heavily in trade promotions but lacks visibility into true incremental lift. In our experience, 30-40% of promo spend in {{industry}} delivers negative ROI when cannibalization and forward-buying are properly measured.',
    dimensions: ['promotions', 'trade spend', 'retail channels'],
    discovery_questions: [
      'What percentage of your volume is sold on promotion?',
      'How do you measure promotion effectiveness today?',
      'Do you account for cannibalization in your promo analysis?',
    ],
    primary_personas: ['sales_commercial', 'cfo_finance'],
    secondary_personas: ['pricing_rgm'],
    industries: ['CPG', 'Retail', 'Food & Beverage'],
  },
  {
    id: 'trade-spend-black-hole',
    name: 'Trade Spend Black Hole',
    category: 'promo_effectiveness',
    description: 'Large trade spend budgets with no visibility into where the money goes',
    trigger_signals: [
      { pattern: 'trade (spend|investment|budget)', weight: 0.9 },
      { pattern: 'trade (management|optimization)', weight: 0.85 },
      { pattern: 'deduction|claim', weight: 0.7 },
      { pattern: 'trade (visibility|analytics)', weight: 0.9 },
      { pattern: 'accrual', weight: 0.6 },
    ],
    hypothesis_template:
      "{{company}} may lack visibility into how trade spend is actually being used by retailers. In {{industry}}, companies typically find 15-20% of trade funds don't result in executed promotions.",
    dimensions: ['trade fund allocation', 'execution compliance', 'deduction management'],
    discovery_questions: [
      'What is your trade spend as a percentage of revenue?',
      'How do you track whether planned promotions are executed?',
      'What is your deduction dispute rate?',
    ],
    primary_personas: ['cfo_finance', 'sales_commercial'],
    secondary_personas: ['pricing_rgm'],
    industries: ['CPG', 'Food & Beverage'],
  },
  {
    id: 'cannibalization-blind',
    name: 'Cannibalization Blindspot',
    category: 'promo_effectiveness',
    description: 'Promotions eat into sales of other products without understanding the full impact',
    trigger_signals: [
      { pattern: 'cannibali', weight: 0.95 },
      { pattern: 'incremental (lift|volume|sales)', weight: 0.8 },
      { pattern: 'baseline', weight: 0.6 },
      { pattern: 'promotion (analysis|analytics)', weight: 0.7 },
      { pattern: 'halo effect', weight: 0.7 },
    ],
    hypothesis_template:
      '{{company}} may not be measuring cannibalization effects of promotions. In {{industry}}, we typically find that 20-35% of promoted volume comes from other products in the portfolio rather than true incremental growth.',
    dimensions: ['portfolio effects', 'brand switching', 'basket composition'],
    discovery_questions: [
      'How do you separate incremental lift from cannibalization?',
      'Do promotions on one product affect sales of related products?',
      'What is your true incremental rate on promotions?',
    ],
    primary_personas: ['pricing_rgm', 'sales_commercial'],
    secondary_personas: ['cfo_finance'],
    industries: ['CPG', 'Retail', 'Food & Beverage'],
  },
  {
    id: 'promo-calendar-chaos',
    name: 'Promotion Calendar Chaos',
    category: 'promo_effectiveness',
    description: 'Promotions planned in silos without coordinated strategy',
    trigger_signals: [
      { pattern: 'promo(tion)? (calendar|planning|schedule)', weight: 0.9 },
      { pattern: 'promotional (coordination|strategy)', weight: 0.8 },
      { pattern: 'joint business planning', weight: 0.7 },
      { pattern: 'retailer (collaboration|planning)', weight: 0.65 },
      { pattern: 'promo conflict', weight: 0.85 },
    ],
    hypothesis_template:
      "{{company}}'s promotional calendar may be fragmented across brands, customers, and channels. In {{industry}}, coordinated promo planning typically improves ROI by 15-20% through reduced overlap and strategic timing.",
    dimensions: ['promo calendar', 'cross-brand coordination', 'retailer alignment'],
    discovery_questions: [
      'How far in advance do you plan promotions?',
      'Is promotional planning coordinated across brands?',
      'How do you prevent promotional conflicts?',
    ],
    primary_personas: ['sales_commercial', 'pricing_rgm'],
    secondary_personas: ['cfo_finance'],
    industries: ['CPG', 'Retail', 'Food & Beverage'],
  },

  // ===== ANALYTICS TRANSFORMATION =====
  {
    id: 'excel-hell',
    name: 'Excel-Driven Analytics',
    category: 'analytics_transformation',
    description: 'Critical business decisions based on manual Excel analysis prone to errors and delays',
    trigger_signals: [
      { pattern: 'digital transformation', weight: 0.7 },
      { pattern: 'data (strategy|initiative)', weight: 0.6 },
      { pattern: '(BI|business intelligence)', weight: 0.7 },
      { pattern: 'analytics (platform|tool)', weight: 0.7 },
      { pattern: 'dashboard', weight: 0.5 },
      { pattern: 'reporting', weight: 0.4 },
      { pattern: 'manual (process|analysis|reporting)', weight: 0.85 },
    ],
    hypothesis_template:
      '{{company}} may be making critical commercial decisions using manual Excel analysis. This typically results in 2-3 week reporting lags and 15-20% error rates in {{industry}} companies we work with.',
    dimensions: ['reporting', 'analytics', 'decision-making'],
    discovery_questions: [
      'How long does it take to produce monthly performance reports?',
      'What percentage of your analytics is done in Excel?',
      'How confident are you in the accuracy of your current reporting?',
    ],
    primary_personas: ['technology_analytics', 'cfo_finance'],
    secondary_personas: ['ceo_gm'],
    industries: ['Manufacturing', 'Distribution', 'CPG', 'Retail'],
  },
  {
    id: 'data-silos',
    name: 'Data Silos',
    category: 'analytics_transformation',
    description: 'Critical business data trapped in disconnected systems',
    trigger_signals: [
      { pattern: 'data (integration|consolidation|warehouse)', weight: 0.8 },
      { pattern: 'system(s)? (integration|modernization)', weight: 0.7 },
      { pattern: 'ERP (implementation|upgrade|migration)', weight: 0.75 },
      { pattern: 'digital transformation', weight: 0.65 },
      { pattern: 'single source of truth', weight: 0.9 },
      { pattern: 'data (silo|fragmentation)', weight: 0.95 },
    ],
    hypothesis_template:
      '{{company}} likely has critical business data trapped in silos across multiple systems. In {{industry}}, this typically prevents leadership from getting a unified view of commercial performance.',
    dimensions: ['data integration', 'single source of truth', 'reporting consistency'],
    discovery_questions: [
      'How many systems do you pull data from for executive reporting?',
      'How long does it take to produce a monthly P&L by product?',
      'Do sales and finance agree on the same numbers?',
    ],
    primary_personas: ['technology_analytics', 'cfo_finance'],
    secondary_personas: ['ceo_gm'],
    industries: [],
  },
  {
    id: 'reporting-lag',
    name: 'Reporting Lag',
    category: 'analytics_transformation',
    description: 'Decisions made on stale data due to slow reporting cycles',
    trigger_signals: [
      { pattern: 'real.?time (data|analytics|reporting)', weight: 0.85 },
      { pattern: 'reporting (cycle|lag|delay)', weight: 0.9 },
      { pattern: 'month.?end (close|reporting)', weight: 0.6 },
      { pattern: 'stale (data|information)', weight: 0.8 },
      { pattern: 'decision (delay|lag)', weight: 0.7 },
    ],
    hypothesis_template:
      '{{company}} may be operating with significant reporting lags, making decisions on data that is weeks old. In {{industry}}, moving from monthly to weekly or daily visibility typically improves commercial outcomes by 5-10%.',
    dimensions: ['reporting frequency', 'data freshness', 'decision speed'],
    discovery_questions: [
      'How old is the data when you make pricing decisions?',
      'How long after month-end do you have complete financials?',
      'Can you react quickly to competitive price changes?',
    ],
    primary_personas: ['technology_analytics', 'cfo_finance'],
    secondary_personas: ['ceo_gm', 'pricing_rgm'],
    industries: [],
  },
  {
    id: 'ai-ready-not',
    name: 'AI/ML Readiness Gap',
    category: 'analytics_transformation',
    description: 'Wants to leverage AI/ML but lacks data foundation and organizational readiness',
    trigger_signals: [
      { pattern: 'AI|artificial intelligence', weight: 0.7 },
      { pattern: 'machine learning|ML', weight: 0.7 },
      { pattern: 'predictive (analytics|model)', weight: 0.8 },
      { pattern: 'advanced analytics', weight: 0.65 },
      { pattern: 'data science', weight: 0.6 },
      { pattern: 'automation', weight: 0.5 },
    ],
    hypothesis_template:
      '{{company}} may be interested in AI/ML capabilities but lacks the data foundation required. In {{industry}}, successful AI implementations require 6-12 months of data preparation that most companies underestimate.',
    dimensions: ['data quality', 'technical infrastructure', 'organizational readiness'],
    discovery_questions: [
      'Have you attempted any AI/ML projects?',
      'How would you rate your data quality on a 1-10 scale?',
      'Do you have data science capabilities in-house?',
    ],
    primary_personas: ['technology_analytics', 'ceo_gm'],
    secondary_personas: ['cfo_finance'],
    industries: [],
  },
];

// ===== Index Utilities =====

// Index by ID for fast lookup
export const PAIN_POINTS_BY_ID: Record<string, PainPoint> = PAIN_POINT_LIBRARY.reduce(
  (acc, pp) => {
    acc[pp.id] = pp;
    return acc;
  },
  {} as Record<string, PainPoint>
);

// Index by angle/category
export const PAIN_POINTS_BY_ANGLE: Record<ResearchAngleId, PainPoint[]> =
  PAIN_POINT_LIBRARY.reduce(
    (acc, pp) => {
      if (!acc[pp.category]) {
        acc[pp.category] = [];
      }
      acc[pp.category].push(pp);
      return acc;
    },
    {} as Record<ResearchAngleId, PainPoint[]>
  );

// Helper to get pain points for an angle
export function getPainPointsForAngle(angleId: ResearchAngleId): PainPoint[] {
  return PAIN_POINTS_BY_ANGLE[angleId] || [];
}

// Helper to get pain point by ID
export function getPainPointById(id: string): PainPoint | undefined {
  return PAIN_POINTS_BY_ID[id];
}
