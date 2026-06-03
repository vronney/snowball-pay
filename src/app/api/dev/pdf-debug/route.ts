import { NextRequest, NextResponse } from 'next/server';
import { parsePdfFile } from '@/lib/services/documentExtraction/pdfParser';
import { detectFrequencyFromDateRange } from '@/lib/services/documentExtraction/incomeExtractor';

/** DEV ONLY — remove before shipping to production */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  const parsed = await parsePdfFile(file);
  const detectedFreq = detectFrequencyFromDateRange(parsed.text);

  return NextResponse.json({
    pageCount: parsed.pageCount,
    hasTextLayer: parsed.hasTextLayer,
    avgCharsPerPage: parsed.avgCharsPerPage,
    detectedFrequency: detectedFreq,
    // Show first 4000 chars so you can see what the extractor produced
    extractedTextPreview: parsed.text.slice(0, 4000),
    // Lines containing likely date/frequency patterns
    relevantLines: parsed.text
      .split('\n')
      .filter((l) =>
        /date|freq|period|begin|end|advice|pay|w-?2|weekly|biweekly|bi-weekly/i.test(l)
      )
      .slice(0, 40),
  });
}
