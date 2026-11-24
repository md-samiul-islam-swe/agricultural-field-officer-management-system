import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 1240; // A4 width at ~150 DPI
const PAGE_HEIGHT = 1754; // A4 height at ~150 DPI
const MARGIN_X = 88;
const MARGIN_TOP = 84;
const MARGIN_BOTTOM = 96;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;
const BODY_FONT =
  '24px "Public Sans", "Noto Sans Bengali", system-ui, -apple-system, sans-serif';
const BODY_LINE_HEIGHT = 36;

function formatReportTimestamp(isoString) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

function formatDuration(totalSeconds) {
  const safeSeconds = Number(totalSeconds) || 0;
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function wrapTextLines(ctx, text, maxWidth) {
  const paragraphs = String(text || '').split(/\r?\n/);
  const lines = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let currentLine = '';

    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth) {
        currentLine = candidate;
      } else {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = '';
        }

        // Break abnormally long single tokens if needed
        if (ctx.measureText(word).width > maxWidth) {
          let chunk = '';
          for (const char of word) {
            const nextChunk = chunk + char;
            if (ctx.measureText(nextChunk).width > maxWidth && chunk) {
              lines.push(chunk);
              chunk = char;
            } else {
              chunk = nextChunk;
            }
          }
          currentLine = chunk;
        } else {
          currentLine = word;
        }
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines.length > 0 ? lines : [''];
}

function createPageCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  return { canvas, ctx };
}

function drawFirstPageHeader(ctx, { scopeLabel, totalNotes, generatedAt }) {
  let y = MARGIN_TOP;

  ctx.fillStyle = '#15803d';
  ctx.font =
    '600 20px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(
    "The Field Officer's Notebook · Agricultural Field Officer Management System",
    MARGIN_X,
    y
  );

  y += 44;
  ctx.fillStyle = '#0f172a';
  ctx.font =
    '700 38px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText('Farm Visit Notes Report', MARGIN_X, y);

  y += 38;
  ctx.fillStyle = '#475569';
  ctx.font =
    '400 20px "Public Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(
    `Generated ${generatedAt}  ·  ${scopeLabel}  ·  ${totalNotes} ${
      totalNotes === 1 ? 'record' : 'records'
    }`,
    MARGIN_X,
    y
  );

  y += 28;
  ctx.strokeStyle = '#15803d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, y);
  ctx.lineTo(PAGE_WIDTH - MARGIN_X, y);
  ctx.stroke();

  return y + 44;
}

function drawContinuationHeader(ctx) {
  const y = MARGIN_TOP;
  ctx.fillStyle = '#64748b';
  ctx.font =
    '500 18px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(
    "The Field Officer's Notebook — Farm Visit Notes Report",
    MARGIN_X,
    y
  );

  const lineY = y + 18;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, lineY);
  ctx.lineTo(PAGE_WIDTH - MARGIN_X, lineY);
  ctx.stroke();

  return lineY + 40;
}

function drawPageFooter(ctx, pageNumber, totalPages) {
  const lineY = PAGE_HEIGHT - MARGIN_BOTTOM + 24;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(MARGIN_X, lineY);
  ctx.lineTo(PAGE_WIDTH - MARGIN_X, lineY);
  ctx.stroke();

  const textY = lineY + 32;
  ctx.fillStyle = '#64748b';
  ctx.font =
    '400 18px "Public Sans", "Noto Sans Bengali", system-ui, sans-serif';
  ctx.fillText(
    "Field Visit Record · The Field Officer's Notebook",
    MARGIN_X,
    textY
  );

  const pageLabel = `Page ${pageNumber} of ${totalPages}`;
  const labelWidth = ctx.measureText(pageLabel).width;
  ctx.fillText(pageLabel, PAGE_WIDTH - MARGIN_X - labelWidth, textY);
}

/**
 * Generates and downloads a printer-friendly multi-page A4 PDF report
 * supporting both English (en-US) and Bangla (bn-BD) text cleanly.
 */
export async function exportVisitNotesToPdf(notes, { isSelection = false } = {}) {
  if (!Array.isArray(notes) || notes.length === 0) {
    throw new Error('No visit notes available to export.');
  }

  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // Proceed cleanly even if font readiness check rejects
    }
  }

  const generatedAt = formatReportTimestamp(new Date().toISOString());
  const scopeLabel = isSelection ? 'Selected Notes' : 'All Recorded Notes';
  const maxContentY = PAGE_HEIGHT - MARGIN_BOTTOM;

  const pages = [];
  let current = createPageCanvas();
  pages.push(current);

  let cursorY = drawFirstPageHeader(current.ctx, {
    scopeLabel,
    totalNotes: notes.length,
    generatedAt,
  });

  const startNewPage = () => {
    current = createPageCanvas();
    pages.push(current);
    cursorY = drawContinuationHeader(current.ctx);
  };

  notes.forEach((note, index) => {
    const ctx = current.ctx;
    ctx.font = BODY_FONT;
    const wrappedLines = wrapTextLines(ctx, note.noteText, CONTENT_WIDTH - 40);

    const cardHeaderHeight = 44;
    const cardPaddingTop = 24;
    const cardPaddingBottom = 24;
    const bodyHeight = wrappedLines.length * BODY_LINE_HEIGHT;
    const estimatedCardHeight =
      cardPaddingTop + cardHeaderHeight + bodyHeight + cardPaddingBottom;

    // Move entire note card to next page if it fits cleanly on a single page
    if (
      cursorY + estimatedCardHeight > maxContentY &&
      estimatedCardHeight <= maxContentY - (MARGIN_TOP + 64)
    ) {
      startNewPage();
    }

    const activeCtx = current.ctx;
    const langLabel =
      note.language === 'bn-BD' ? 'Bangla (bn-BD)' : 'English (en-US)';
    const metaText = `${langLabel}  ·  Duration: ${formatDuration(
      note.durationSeconds
    )}  ·  ${formatReportTimestamp(note.recordedAt)}`;

    // Ensure card header fits before drawing
    if (cursorY + cardPaddingTop + cardHeaderHeight + BODY_LINE_HEIGHT > maxContentY) {
      startNewPage();
    }

    const headerCtx = current.ctx;
    const cardStartY = cursorY;

    // Subtle top border for each visit entry
    headerCtx.fillStyle = '#f8fafc';
    headerCtx.fillRect(MARGIN_X, cardStartY, CONTENT_WIDTH, 48);
    headerCtx.strokeStyle = '#cbd5e1';
    headerCtx.lineWidth = 1.5;
    headerCtx.beginPath();
    headerCtx.moveTo(MARGIN_X, cardStartY);
    headerCtx.lineTo(PAGE_WIDTH - MARGIN_X, cardStartY);
    headerCtx.moveTo(MARGIN_X, cardStartY + 48);
    headerCtx.lineTo(PAGE_WIDTH - MARGIN_X, cardStartY + 48);
    headerCtx.stroke();

    // Entry number
    headerCtx.fillStyle = '#0f172a';
    headerCtx.font =
      '700 21px "Plus Jakarta Sans", "Noto Sans Bengali", system-ui, sans-serif';
    headerCtx.fillText(`Visit Note #${index + 1}`, MARGIN_X + 20, cardStartY + 31);

    // Entry metadata aligned right
    headerCtx.fillStyle = '#475569';
    headerCtx.font =
      '500 18px "Public Sans", "Noto Sans Bengali", system-ui, sans-serif';
    const metaWidth = headerCtx.measureText(metaText).width;
    headerCtx.fillText(
      metaText,
      PAGE_WIDTH - MARGIN_X - 20 - metaWidth,
      cardStartY + 31
    );

    cursorY = cardStartY + 48 + 30;

    // Draw wrapped lines (spanning across pages cleanly if a note is very long)
    for (const line of wrappedLines) {
      if (cursorY + BODY_LINE_HEIGHT > maxContentY) {
        startNewPage();
      }
      const lineCtx = current.ctx;
      lineCtx.fillStyle = '#1e293b';
      lineCtx.font = BODY_FONT;
      if (line) {
        lineCtx.fillText(line, MARGIN_X + 20, cursorY);
      }
      cursorY += BODY_LINE_HEIGHT;
    }

    // Bottom divider after entry
    cursorY += 12;
    if (cursorY <= maxContentY) {
      const endCtx = current.ctx;
      endCtx.strokeStyle = '#e2e8f0';
      endCtx.lineWidth = 1.5;
      endCtx.beginPath();
      endCtx.moveTo(MARGIN_X, cursorY);
      endCtx.lineTo(PAGE_WIDTH - MARGIN_X, cursorY);
      endCtx.stroke();
    }

    cursorY += 28;
  });

  // Stamp footer with total page count on every page
  const totalPages = pages.length;
  pages.forEach((page, idx) => {
    drawPageFooter(page.ctx, idx + 1, totalPages);
  });

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((page, idx) => {
    if (idx > 0) {
      pdf.addPage();
    }
    const imageData = page.canvas.toDataURL('image/png');
    pdf.addImage(imageData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  });

  const dateStamp = new Date().toISOString().slice(0, 10);
  pdf.save(`farm-visit-notes-${dateStamp}.pdf`);
}
