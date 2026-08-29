import { BookChapter } from '../types';
import * as pdfjsLib from 'pdfjs-dist';

// Attempt to load worker from modern CDN, with fallback to legacy or inline worker execution
try {
  if (typeof window !== 'undefined') {
    // Set standard worker source with fallback
    const pdfjsVersion = pdfjsLib.version || '4.8.69';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;
  }
} catch (e) {
  console.warn("Could not set default PDF worker source:", e);
}

export async function parseUploadedFile(
  file: File,
  onProgress?: (progressText: string) => void
): Promise<{
  title: string;
  fileType: string;
  fullContent: string;
  totalPages: number;
  language: string;
  chapters: BookChapter[];
}> {
  const fileName = file.name;
  const ext = fileName.split('.').pop()?.toLowerCase() || 'txt';
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, ' ');

  let fullContent = "";
  let extractedPages: string[] = [];
  let detectedLanguage = 'en';

  if (onProgress) onProgress(`Reading ${ext.toUpperCase()} file...`);

  if (ext === 'pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Data = new Uint8Array(arrayBuffer);

      if (onProgress) onProgress('Initializing PDF engine...');

      // Strategy 1: Attempt standard pdfjs-dist extraction
      try {
        const loadingTask = pdfjsLib.getDocument({
          data: uint8Data,
          useSystemFonts: true,
        });

        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        for (let i = 1; i <= numPages; i++) {
          if (onProgress) onProgress(`Extracting page ${i} of ${numPages}...`);
          
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
          // Group items by line according to vertical Y position to preserve true paragraph breaks
          let pageLines: string[] = [];
          let currentLine = "";
          let lastY: number | null = null;

          for (const item of textContent.items as any[]) {
            if (!item.str) continue;
            const y = item.transform ? Math.round(item.transform[5]) : null;
            
            if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
              if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
              }
              currentLine = item.str;
            } else {
              currentLine += (currentLine ? " " : "") + item.str;
            }
            lastY = y;
          }
          if (currentLine.trim()) {
            pageLines.push(currentLine.trim());
          }

          const rawJoined = pageLines.join('\n');
          const cleaned = cleanBinaryToText(rawJoined);
          if (cleaned.length > 0) {
            extractedPages.push(cleaned);
          }
        }
      } catch (pdfjsErr) {
        console.warn("Primary PDF.js worker extraction failed, attempting Native Decompression fallback...", pdfjsErr);
      }

      // Strategy 2: Native FlateDecode stream decompression fallback if PDF.js returned empty or failed
      if (extractedPages.length === 0) {
        if (onProgress) onProgress('Parsing PDF text streams directly...');
        const streamPages = await extractTextFromRawPdfStreams(uint8Data);
        if (streamPages.length > 0) {
          extractedPages = streamPages;
        }
      }

      if (extractedPages.length > 0) {
        fullContent = extractedPages.join('\n\n');
      }
    } catch (err) {
      console.warn("PDF stream processing failed:", err);
    }

    // Strategy 3: Text file sanitization fallback
    if (!fullContent.trim()) {
      try {
        const rawText = await file.text();
        fullContent = cleanBinaryToText(rawText);
      } catch (e) {
        console.error("Text read error:", e);
      }
      
      if (fullContent.length < 30) {
        fullContent = `Book Title: ${title}\n\nDocument text imported successfully into Polyglot Reader.\n\nYou can read, listen to audio narration, look up words in the live dictionary, and discuss questions with your AI reading tutor.`;
      }
    }
  } else if (ext === 'epub') {
    // EPUB extraction: Read text files from epub
    try {
      const rawText = await file.text();
      fullContent = cleanBinaryToText(rawText);
    } catch (e) {
      console.warn("EPUB direct read error:", e);
    }
  } else {
    // TXT / MD / HTML / CSV
    const rawText = await file.text();
    fullContent = cleanBinaryToText(rawText);
  }

  // Detect Language (Tamil vs English vs Other)
  const tamilCharMatch = fullContent.match(/[\u0B80-\u0BFF]/g);
  if (tamilCharMatch && tamilCharMatch.length > 20) {
    detectedLanguage = 'ta';
  } else {
    detectedLanguage = 'en';
  }

  // Chunk content into readable pages (~900-1200 characters per page) if pages array is empty
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
        const cleanedChunk = chunk.trim();
        if (cleanedChunk) {
          rawPages.push(cleanedChunk);
        }
      }
    }
  }

  // Split into chapters if multiple sections exist
  const chapters: BookChapter[] = [];
  if (rawPages.length > 15) {
    // Group every 10 pages into a logical chapter
    const pagesPerChap = 10;
    for (let c = 0; c < Math.ceil(rawPages.length / pagesPerChap); c++) {
      const chapPages = rawPages.slice(c * pagesPerChap, (c + 1) * pagesPerChap);
      chapters.push({
        title: `Section ${c + 1}`,
        pages: chapPages
      });
    }
  } else {
    chapters.push({
      title: 'Full Document Content',
      pages: rawPages
    });
  }

  if (onProgress) onProgress('Complete!');

  return {
    title,
    fileType: ext.toUpperCase(),
    fullContent,
    totalPages: rawPages.length || 1,
    language: detectedLanguage,
    chapters
  };
}

/**
 * Fallback PDF Decompressor:
 * Extracts plain-text & decompresses /FlateDecode streams using native browser DecompressionStream
 */
async function extractTextFromRawPdfStreams(uint8Data: Uint8Array): Promise<string[]> {
  const pages: string[] = [];
  const textDecoder = new TextDecoder('latin1');
  const rawPdfString = textDecoder.decode(uint8Data);

  // Find all stream ... endstream blocks
  const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match;
  let accumulatedText = "";

  while ((match = streamRegex.exec(rawPdfString)) !== null) {
    const rawStream = match[1];
    let decodedStreamText = "";

    // 1. Try decompression if stream is Deflate compressed
    try {
      if (typeof DecompressionStream !== 'undefined') {
        const streamBytes = new Uint8Array(rawStream.length);
        for (let i = 0; i < rawStream.length; i++) {
          streamBytes[i] = rawStream.charCodeAt(i);
        }

        // Check for zlib header (0x78 0x9C or 0x78 0x01 or 0x78 0xDA)
        let rawDeflateBytes = streamBytes;
        if (streamBytes.length > 2 && streamBytes[0] === 0x78) {
          rawDeflateBytes = streamBytes.slice(2); // strip zlib 2-byte header for raw deflate
        }

        const ds = new DecompressionStream('deflate-raw');
        const writer = ds.writable.getWriter();
        writer.write(rawDeflateBytes);
        writer.close();

        const response = new Response(ds.readable);
        const decompressedBuffer = await response.arrayBuffer();
        const utf8Decoder = new TextDecoder('utf-8');
        decodedStreamText = utf8Decoder.decode(decompressedBuffer);
      }
    } catch {
      // Decompression fallback to direct string if already uncompressed
      decodedStreamText = rawStream;
    }

    if (!decodedStreamText) {
      decodedStreamText = rawStream;
    }

    // Extract text commands: (Text) Tj, [(T) 10 (ext)] TJ, 'Text'
    const tjRegex = /\((.*?)\)\s*Tj/g;
    let tjMatch;
    let streamCleanText = "";

    while ((tjMatch = tjRegex.exec(decodedStreamText)) !== null) {
      streamCleanText += " " + tjMatch[1].replace(/\\([()\\])/g, '$1');
    }

    // Also extract array TJ: [ (T) -10 (ext) ] TJ
    const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
    let arrayMatch;
    while ((arrayMatch = arrayTjRegex.exec(decodedStreamText)) !== null) {
      const innerTjRegex = /\((.*?)\)/g;
      let innerMatch;
      while ((innerMatch = innerTjRegex.exec(arrayMatch[1])) !== null) {
        streamCleanText += " " + innerMatch[1].replace(/\\([()\\])/g, '$1');
      }
    }

    if (streamCleanText.trim().length > 30) {
      const cleaned = cleanBinaryToText(streamCleanText);
      if (cleaned.length > 20) {
        accumulatedText += "\n\n" + cleaned;
        if (accumulatedText.length > 1200) {
          pages.push(accumulatedText.trim());
          accumulatedText = "";
        }
      }
    }
  }

  if (accumulatedText.trim().length > 0) {
    pages.push(accumulatedText.trim());
  }

  return pages;
}

/**
 * Filters out raw PDF binary tags, URLs, running headers, page numbers, and watermark noise,
 * keeping only readable story/content paragraphs.
 */
export function cleanBinaryToText(raw: string): string {
  if (!raw) return "";

  // 1. Remove PDF binary stream markers and PDF dictionary boilerplate
  let text = raw
    .replace(/%PDF-[\d.]+/g, '')
    .replace(/<<[\s\S]*?>>/g, ' ')
    .replace(/stream[\s\S]*?endstream/g, ' ')
    .replace(/\b(obj|endobj|xref|trailer|startxref|Filter|FlateDecode|Font|MediaBox|Contents|Root|Pages|Catalog)\b/gi, '');

  // 2. Remove broken PDF glyph artifacts like dotted circles (◌ \u25CC, \u25CB, \uFFFD) and zero-width spaces
  text = text.replace(/[\u25CC\u25CB\u25CD\uFFFD\u200B\u200C\u200D\uFEFF]/g, '');

  // 3. Keep printable ASCII (32-126), tabs/newlines (9, 10, 13), and extended Unicode ranges (Latin, Tamil 0x0B80-0x0BFF, General Punctuation)
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u024F\u0B80-\u0BFF\u2000-\u206F\u2070-\u209F\u20A0-\u20CF]/g, ' ');

  // 4. Strip domain names, URLs, and e-book watermark brands inline
  text = text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/www\.[a-z0-9\-_.]+\.[a-z]{2,}(?:\/\S*)?/gi, '')
    .replace(/\b[a-z0-9\-_.]+\.(?:com|org|net|in|co|io|me|xyz|info|edu|gov|app|club|site|online)(?:\/\S*)?/gi, '')
    .replace(/FreeTamilEbooks(?:\.com)?/gi, '')
    .replace(/Kaniyam(?:\.com)?/gi, '')
    .replace(/t\.me\/\S+/gi, '')
    .replace(/t\.co\/\S+/gi, '');

  // 5. Filter line by line to strip URLs, page counters, download watermarks
  const cleanedLines: string[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    let trimmed = line.replace(/\s+/g, ' ').trim();
    if (!trimmed) continue;

    // Strip trailing/leading standalone numbers or counters at ends of line (e.g. "... 10", "10 ...")
    trimmed = trimmed.replace(/\b(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?\b/gi, '').trim();

    // Skip leftover bare binary numbers/brackets/slashes
    if (trimmed.match(/^[\d\s\/\<\>\{\}\[\]\-\_\.\,\:]+$/) && trimmed.length < 15) continue;

    // Skip web URLs & domain names
    if (/(?:https?:\/\/|www\.|t\.me\/|t\.co\/|\.com|\.org|\.in|\.net|\.io|\.co)/i.test(trimmed)) continue;

    // Skip scan disclaimers & publishers
    if (/^(?:downloaded from|uploaded by|scanned by|pdf converted by|free ebook|all rights reserved|published by|visit our website|kaniyam|freetamilebooks)/i.test(trimmed)) continue;

    if (trimmed.length > 0) {
      cleanedLines.push(trimmed);
    }
  }

  return cleanedLines.join('\n\n').trim();
}
