declare module 'yauzl' {
  import { EventEmitter } from 'events';

  interface Entry {
    fileName: string;
    uncompressedSize: number;
    compressedSize: number;
  }

  class ZipFile extends EventEmitter {
    readEntry(): void;
    on(event: 'entry', listener: (entry: Entry) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  function fromBuffer(
    buffer: Buffer,
    options: { lazyEntries?: boolean },
    callback: (err: Error | null, zipfile?: ZipFile) => void,
  ): void;
}

declare module 'pdf-parse' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: {
      Title?: string;
      Author?: string;
      [key: string]: unknown;
    };
    metadata: unknown;
    text: string;
    version: string;
  }

  function pdfParse(
    dataBuffer: Buffer,
    options?: { max?: number },
  ): Promise<PdfParseResult>;

  export default pdfParse;
}
