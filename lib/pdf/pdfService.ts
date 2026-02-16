import PDFDocument from 'pdfkit';
import archiver from 'archiver';
import type { ResearchOutputV3 } from '@/types/researchTypesV3';
import { PERSONA_DISPLAY_NAMES_V3 } from '@/types/researchTypesV3';

// Brand colors (hex)
const TEAL_700 = '#0d5c63';
const TEAL_500 = '#14857f';
const GOLD_500 = '#e4a853';
const SLATE_700 = '#334155';
const SLATE_500 = '#64748b';
const SLATE_300 = '#cbd5e1';
const WHITE = '#ffffff';

interface PDFOptions {
  format?: 'a4' | 'letter';
}

interface SessionData {
  id: string;
  company_name: string;
  research_type: string;
  created_at: string;
  research_output: ResearchOutputV3;
}

/**
 * Generate a Job Order PDF from research output
 */
export async function generateJobOrderPDF(
  session: SessionData,
  options: PDFOptions = {}
): Promise<Buffer> {
  const { format = 'letter' } = options;
  const research = session.research_output;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: format === 'a4' ? 'A4' : 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Research Report - ${research.company_profile?.confirmed_name || session.company_name}`,
        Author: 'Revify Outreach',
        Subject: 'Company Research Report',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100; // margins

    // ===== HEADER =====
    drawHeader(doc, research, session, pageWidth);

    // ===== COMPANY PROFILE =====
    if (research.company_profile) {
      drawCompanyProfile(doc, research.company_profile, pageWidth);
    }

    // ===== RECENT SIGNALS =====
    if (research.recent_signals?.length) {
      drawSignals(doc, research.recent_signals, pageWidth);
    }

    // ===== PAIN POINTS =====
    if (research.pain_point_hypotheses?.length) {
      drawPainPoints(doc, research.pain_point_hypotheses, pageWidth);
    }

    // ===== PERSONA ANGLES =====
    if (research.persona_angles) {
      drawPersonaAngles(doc, research.persona_angles, pageWidth);
    }

    // ===== OUTREACH PRIORITY =====
    if (research.outreach_priority) {
      drawOutreachPriority(doc, research.outreach_priority, pageWidth);
    }

    // ===== CONFIDENCE & METADATA =====
    if (research.research_confidence) {
      drawConfidence(doc, research.research_confidence, pageWidth);
    }

    // ===== FOOTER =====
    drawFooter(doc, session);

    doc.end();
  });
}

/**
 * Generate a ZIP of individual PDFs for multiple sessions
 */
export async function generateBulkZip(
  sessions: SessionData[],
  options: PDFOptions = {}
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const chunks: Buffer[] = [];
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    for (const session of sessions) {
      try {
        const pdf = await generateJobOrderPDF(session, options);
        const safeName = session.company_name.replace(/[^a-zA-Z0-9_-]/g, '_');
        archive.append(pdf, { name: `${safeName}_research_report.pdf` });
      } catch (err) {
        console.error(`Failed to generate PDF for ${session.company_name}:`, err);
      }
    }

    archive.finalize();
  });
}

/**
 * Generate a combined PDF with all sessions
 */
export async function generateCombinedPDF(
  sessions: SessionData[],
  options: PDFOptions = {}
): Promise<Buffer> {
  const { format = 'letter' } = options;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({
      size: format === 'a4' ? 'A4' : 'LETTER',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: `Bulk Research Report - ${sessions.length} Companies`,
        Author: 'Revify Outreach',
      },
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 100;

    // Cover page
    doc.fontSize(28).fillColor(TEAL_700).text('Revify Outreach', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(20).fillColor(SLATE_700).text('Bulk Research Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(SLATE_500).text(`${sessions.length} Companies`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });

    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      const research = session.research_output;
      if (!research) continue;

      doc.addPage();

      drawHeader(doc, research, session, pageWidth);

      if (research.company_profile) {
        drawCompanyProfile(doc, research.company_profile, pageWidth);
      }

      if (research.recent_signals?.length) {
        drawSignals(doc, research.recent_signals, pageWidth);
      }

      if (research.pain_point_hypotheses?.length) {
        drawPainPoints(doc, research.pain_point_hypotheses, pageWidth);
      }

      if (research.persona_angles) {
        drawPersonaAngles(doc, research.persona_angles, pageWidth);
      }

      if (research.outreach_priority) {
        drawOutreachPriority(doc, research.outreach_priority, pageWidth);
      }

      if (research.research_confidence) {
        drawConfidence(doc, research.research_confidence, pageWidth);
      }

      drawFooter(doc, session);
    }

    doc.end();
  });
}

// ===== Drawing helpers =====

function checkPageBreak(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - 70) {
    doc.addPage();
  }
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  checkPageBreak(doc, 40);
  doc.moveDown(1);
  doc
    .fontSize(13)
    .fillColor(TEAL_700)
    .text(title.toUpperCase(), { underline: false });
  // Accent line
  doc
    .moveTo(doc.x, doc.y + 2)
    .lineTo(doc.x + 100, doc.y + 2)
    .strokeColor(GOLD_500)
    .lineWidth(2)
    .stroke();
  doc.moveDown(0.5);
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  research: ResearchOutputV3,
  session: SessionData,
  pageWidth: number
) {
  const companyName = research.company_profile?.confirmed_name || session.company_name;

  // Header bar
  doc
    .rect(50, 50, pageWidth, 60)
    .fill(TEAL_700);

  doc
    .fontSize(22)
    .fillColor(WHITE)
    .text(companyName, 65, 62, { width: pageWidth - 30 });

  const researchLabel = `${session.research_type.charAt(0).toUpperCase() + session.research_type.slice(1)} Research`;
  doc
    .fontSize(10)
    .fillColor(GOLD_500)
    .text(researchLabel, 65, 88, { width: pageWidth - 30 });

  // Date on right
  const dateStr = new Date(session.created_at).toLocaleDateString();
  doc
    .fontSize(9)
    .fillColor('#a0c4c7')
    .text(dateStr, 65, 88, { width: pageWidth - 30, align: 'right' });

  doc.y = 125;
}

function drawCompanyProfile(
  doc: PDFKit.PDFDocument,
  profile: ResearchOutputV3['company_profile'],
  pageWidth: number
) {
  drawSectionHeader(doc, 'Company Profile');

  const fields = [
    { label: 'Industry', value: profile.industry },
    { label: 'Revenue', value: profile.estimated_revenue },
    { label: 'Employees', value: profile.employee_count },
    { label: 'Headquarters', value: profile.headquarters },
    { label: 'Founded', value: profile.founded_year },
    { label: 'Ownership', value: profile.ownership_type },
    { label: 'Website', value: profile.website },
    { label: 'Market Position', value: profile.market_position },
  ].filter((f) => f.value);

  const colWidth = pageWidth / 2;
  for (let i = 0; i < fields.length; i += 2) {
    checkPageBreak(doc, 20);
    const y = doc.y;
    const left = fields[i];
    const right = fields[i + 1];

    doc.fontSize(8).fillColor(SLATE_500).text(left.label, 55, y, { width: colWidth - 10 });
    doc.fontSize(10).fillColor(SLATE_700).text(left.value!, 55, y + 11, { width: colWidth - 10 });

    if (right) {
      doc.fontSize(8).fillColor(SLATE_500).text(right.label, 55 + colWidth, y, { width: colWidth - 10 });
      doc.fontSize(10).fillColor(SLATE_700).text(right.value!, 55 + colWidth, y + 11, { width: colWidth - 10 });
    }

    doc.y = y + 28;
  }
}

function drawSignals(
  doc: PDFKit.PDFDocument,
  signals: ResearchOutputV3['recent_signals'],
  _pageWidth: number
) {
  drawSectionHeader(doc, 'Recent Signals');

  for (const signal of signals.slice(0, 8)) {
    checkPageBreak(doc, 45);
    const headline = signal.headline || signal.signal || 'Signal';
    const detail = signal.detail || signal.description || '';

    // Signal type badge
    doc.fontSize(7).fillColor(TEAL_500).text(signal.type.toUpperCase(), { continued: false });

    doc.fontSize(10).fillColor(SLATE_700).text(headline);
    if (detail) {
      doc.fontSize(8).fillColor(SLATE_500).text(detail, { width: 450 });
    }

    const meta: string[] = [];
    if (signal.source_name) meta.push(signal.source_name);
    if (signal.date) meta.push(signal.date);
    if (meta.length) {
      doc.fontSize(7).fillColor(SLATE_300).text(meta.join(' | '));
    }

    doc.moveDown(0.3);
  }
}

function drawPainPoints(
  doc: PDFKit.PDFDocument,
  painPoints: NonNullable<ResearchOutputV3['pain_point_hypotheses']>,
  _pageWidth: number
) {
  drawSectionHeader(doc, 'Pain Point Hypotheses');

  for (let i = 0; i < painPoints.length; i++) {
    const pp = painPoints[i];
    checkPageBreak(doc, 50);

    // Numbered header
    doc.fontSize(10).fillColor(TEAL_700).text(`${i + 1}. ${pp.hypothesis}`, { width: 450 });

    if (pp.evidence) {
      doc.fontSize(8).fillColor(SLATE_500).text(`Evidence: ${pp.evidence}`, { width: 450 });
    }

    if (pp.revology_solution_fit) {
      doc.fontSize(8).fillColor(GOLD_500).text(`Solution Fit: ${pp.revology_solution_fit}`, { width: 450 });
    }

    if (pp.confidence) {
      const confidenceColor = pp.confidence === 'high' ? '#059669' : pp.confidence === 'medium' ? '#d97706' : '#dc2626';
      doc.fontSize(7).fillColor(confidenceColor).text(`Confidence: ${pp.confidence.toUpperCase()}${pp.confidence_score ? ` (${pp.confidence_score}%)` : ''}`);
    }

    doc.moveDown(0.4);
  }
}

function drawPersonaAngles(
  doc: PDFKit.PDFDocument,
  angles: NonNullable<ResearchOutputV3['persona_angles']>,
  _pageWidth: number
) {
  drawSectionHeader(doc, 'Persona Angles');

  const personas = Object.entries(angles) as [string, { hook: string; supporting_point: string; question: string }][];

  for (const [key, angle] of personas) {
    if (!angle?.hook) continue;
    checkPageBreak(doc, 55);

    const displayName = PERSONA_DISPLAY_NAMES_V3[key] || key;
    doc.fontSize(10).fillColor(TEAL_700).text(displayName);
    doc.fontSize(9).fillColor(SLATE_700).text(`Hook: ${angle.hook}`, { width: 450 });
    doc.fontSize(8).fillColor(SLATE_500).text(`Supporting: ${angle.supporting_point}`, { width: 450 });
    doc.fontSize(8).fillColor(SLATE_500).text(`Question: ${angle.question}`, { width: 450 });
    doc.moveDown(0.4);
  }
}

function drawOutreachPriority(
  doc: PDFKit.PDFDocument,
  priority: NonNullable<ResearchOutputV3['outreach_priority']>,
  _pageWidth: number
) {
  drawSectionHeader(doc, 'Outreach Priority');

  if (priority.recommended_personas?.length) {
    const names = priority.recommended_personas
      .map((p) => PERSONA_DISPLAY_NAMES_V3[p] || p)
      .join(', ');
    doc.fontSize(9).fillColor(SLATE_700).text(`Recommended: ${names}`);
  }

  if (priority.urgency) {
    const urgencyColor = priority.urgency === 'high' ? '#dc2626' : priority.urgency === 'medium' ? '#d97706' : SLATE_500;
    doc.fontSize(9).fillColor(urgencyColor).text(`Urgency: ${priority.urgency.toUpperCase()}`);
    if (priority.urgency_reason) {
      doc.fontSize(8).fillColor(SLATE_500).text(priority.urgency_reason);
    }
  }

  if (priority.timing_notes) {
    doc.fontSize(8).fillColor(SLATE_500).text(`Timing: ${priority.timing_notes}`);
  }

  const cautions = Array.isArray(priority.cautions) ? priority.cautions.join('; ') : priority.cautions;
  if (cautions) {
    doc.fontSize(8).fillColor('#d97706').text(`Cautions: ${cautions}`);
  }
}

function drawConfidence(
  doc: PDFKit.PDFDocument,
  confidence: NonNullable<ResearchOutputV3['research_confidence']>,
  pageWidth: number
) {
  drawSectionHeader(doc, 'Research Confidence');

  checkPageBreak(doc, 40);

  // Overall score
  const scorePercent = Math.round(confidence.overall_score * 100);
  const scoreColor = scorePercent >= 70 ? '#059669' : scorePercent >= 40 ? '#d97706' : '#dc2626';

  doc.fontSize(18).fillColor(scoreColor).text(`${scorePercent}%`, { continued: true });
  doc.fontSize(10).fillColor(SLATE_500).text('  Overall Confidence');
  doc.moveDown(0.3);

  // Sub-scores
  const scores = [
    { label: 'Source Quality', value: confidence.source_quality },
    { label: 'Signal Freshness', value: confidence.signal_freshness },
    { label: 'Financial Confidence', value: confidence.financial_confidence },
    { label: 'Search Coverage', value: confidence.search_coverage },
  ].filter((s) => s.value != null);

  if (scores.length) {
    const colWidth = pageWidth / scores.length;
    const y = doc.y;
    scores.forEach((s, i) => {
      const pct = Math.round((s.value || 0) * 100);
      doc.fontSize(8).fillColor(SLATE_500).text(s.label, 55 + i * colWidth, y, { width: colWidth - 5 });
      doc.fontSize(11).fillColor(SLATE_700).text(`${pct}%`, 55 + i * colWidth, y + 12, { width: colWidth - 5 });
    });
    doc.y = y + 30;
  }

  // Gaps
  if (confidence.gaps?.length) {
    doc.moveDown(0.3);
    doc.fontSize(8).fillColor(SLATE_500).text('Research Gaps:');
    for (const gap of confidence.gaps) {
      doc.fontSize(8).fillColor(SLATE_700).text(`  - ${gap}`, { width: 450 });
    }
  }
}

function drawFooter(doc: PDFKit.PDFDocument, session: SessionData) {
  const pageBottom = doc.page.height - 40;
  doc
    .fontSize(7)
    .fillColor(SLATE_300)
    .text(
      `Generated by Revify Outreach | Session: ${session.id.slice(0, 8)} | ${new Date().toISOString().split('T')[0]}`,
      50,
      pageBottom,
      { align: 'center', width: doc.page.width - 100 }
    );
}
