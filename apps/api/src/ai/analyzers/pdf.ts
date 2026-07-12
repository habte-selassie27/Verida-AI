// PDF Analyzer — extracts text content and metadata from PDF files.
// Uses pdf-parse for text extraction with page count and basic stats.

import { DatasetType } from '@verida/shared';
import type { DatasetProfile } from '@verida/shared';
import type { DatasetAnalyzer, AnalyzerContext } from './types.js';

export class PdfAnalyzer implements DatasetAnalyzer {
  supports(type: DatasetType): boolean {
    return type === DatasetType.PDF;
  }

  async analyze(buffer: Buffer, ctx: AnalyzerContext): Promise<DatasetProfile> {
    let pageCount = 0;
    let charCount = 0;
    let wordCount = 0;
    let title = '';
    let author = '';
    let extractedText = '';

    try {
      const pdfParseModule = await import('pdf-parse');
      const pdfParse = pdfParseModule.default;
      const result = await pdfParse(buffer, {
        max: 50, // limit to first 50 pages for performance
      });

      pageCount = result.numpages ?? 0;
      charCount = result.text?.length ?? 0;
      wordCount = result.text ? result.text.split(/\s+/).filter(Boolean).length : 0;
      extractedText = result.text?.slice(0, 10_000) ?? '';
      title = result.info?.Title ?? '';
      author = result.info?.Author ?? '';
    } catch (err) {
      // PDF parsing can fail on encrypted or malformed files
      // Still produce a valid profile with metadata we can extract from the header
      const headerInfo = parsePdfHeader(buffer);
      pageCount = headerInfo.pageCount;
      title = headerInfo.title;
    }

    const sizeKb = (buffer.length / 1024).toFixed(1);
    const description = [
      title ? `PDF: ${title}` : 'PDF document',
      `${pageCount} page${pageCount !== 1 ? 's' : ''}`,
      `${wordCount.toLocaleString()} words`,
      `${sizeKb} KB`,
    ].filter(Boolean).join('. ') + '.';

    return {
      title: title || ctx.fileName,
      description,
      modality: 'document',
      datasetType: DatasetType.PDF,
      tags: [],
      metadata: {
        pageCount,
        wordCount,
        charCount,
        author: author || undefined,
        byteSize: buffer.length,
        extractedTextPreview: extractedText.slice(0, 2000) || undefined,
      },
    };
  }
}

function parsePdfHeader(buffer: Buffer): { pageCount: number; title: string } {
  // Quick parse: count page objects and extract title from PDF trailer
  const text = buffer.toString('latin1');
  const pageMatches = text.match(/\/Type\s*\/Page[^s]/g);
  const pageCount = pageMatches?.length ?? 0;

  let title = '';
  const titleMatch = text.match(/\/Title\s*\(([^)]+)\)/);
  if (titleMatch?.[1]) {
    title = titleMatch[1];
  }

  return { pageCount, title };
}
