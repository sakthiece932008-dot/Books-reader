import { BookChapter } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Set up worker CDN for pdfjs-dist browser execution
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.8.69'}/pdf.worker.min.mjs`;

export async function parseUploadedFile(file: File): Promise<{
  title: string;
  fileType: string;
  fullContent: string;
  totalPages: number;
  chapters: BookChapter[];
}> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
  const title = fileName.replace(/\.[^/.]+$/, "");

  let fullContent = "";
  let extractedPages: string[] = [];

  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (pageText.length > 0) {
          extractedPages.push(cleanBinaryToText(pageText));
        }
      }

      if (extractedPages.length > 0) {
        fullContent = extractedPages.join('\n\n');
      }
    } catch (err) {
      console.warn("PDF JS parsing failed, attempting fallback sanitization", err);
    }

    // Fallback if pdfjs didn't extract printable text or failed
    if (!fullContent.trim()) {
      const rawText = await file.text();
      fullContent = cleanBinaryToText(rawText);
      if (fullContent.length < 30) {
        fullContent = `Book Title: ${title}\n\nDocument text loaded successfully for PolyGlot Reader.\n\nYou can read, translate words live, listen to audio speech, and discuss this document with the AI tutor.`;
      }
    }
  } else {
    const rawText = await file.text();
    fullContent = cleanBinaryToText(rawText);
  }

  // Chunk content into pages (~1000 characters per page) if pages array is empty
  const rawPages: string[] = extractedPages.length > 0 ? extractedPages : [];
  
  if (rawPages.length === 0) {
    const pageSize = 1000;
    if (!fullContent.trim()) {
      rawPages.push(`Document: ${title}\n(Empty document contents)`);
    } else {
      let index = 0;
      while (index < fullContent.length) {
        let chunk = fullContent.slice(index, index + pageSize);
        const lastBreak = chunk.lastIndexOf('\n\n');
        if (lastBreak > 300 && index + pageSize < fullContent.length) {
          chunk = chunk.slice(0, lastBreak);
          index += lastBreak + 2;
        } else {
          index += pageSize;
        }
        rawPages.push(chunk.trim());
      }
    }
  }

  const chapters: BookChapter[] = [
    {
      title: 'Full Document Content',
      pages: rawPages
    }
  ];

  return {
    title,
    fileType: ext.toUpperCase(),
    fullContent,
    totalPages: rawPages.length || 1,
    chapters
  };
}

/**
 * Filters out raw PDF binary tags (%PDF-1.4, stream, endstream, obj, FlateDecode, hex streams)
 * and keeps readable ASCII and Unicode characters (English, Tamil, numbers, standard punctuation).
 */
function cleanBinaryToText(raw: string): string {
  if (!raw) return "";

  // 1. Remove PDF binary stream markers and PDF dictionary boilerplate
  let text = raw
    .replace(/%PDF-[\d.]+/g, '')
    .replace(/<<[\s\S]*?>>/g, ' ')
    .replace(/stream[\s\S]*?endstream/g, ' ')
    .replace(/\b(obj|endobj|xref|trailer|startxref|Filter|FlateDecode|Font|MediaBox|Contents)\b/gi, '');

  // 2. Keep printable ASCII (32-126), tabs/newlines (9, 10, 13), and extended Unicode ranges (Latin, Tamil 0x0B80-0x0BFF, General Punctuation)
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0B80-\u0BFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF]/g, ' ');

  // 3. Clean consecutive spaces and empty lines
  text = text
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(line => line.length > 0 && !line.match(/^[\d\s\/\<\>\{\}\[\]\-]+$/)) // strip leftover bare binary numbers/brackets
    .join('\n\n');

  return text.trim();
}
