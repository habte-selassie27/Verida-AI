import { describe, it, expect } from 'vitest';
import { buildPreviewFromText, PREVIEW_MAX_ROWS, PREVIEW_MAX_CELL_CHARS } from './datasetPreview.js';

describe('buildPreviewFromText — CSV', () => {
  it('parses header + first 5 rows', () => {
    const csv = [
      'id,name,score',
      '1,alice,0.9',
      '2,bob,0.8',
      '3,carol,0.7',
      '4,dave,0.6',
      '5,eve,0.5',
      '6,frank,0.4',
    ].join('\n');

    const preview = buildPreviewFromText(csv, 'csv');

    expect(preview?.previewable).toBe(true);
    expect(preview?.columns).toEqual(['id', 'name', 'score']);
    expect(preview?.rows).toHaveLength(5);
    expect(preview?.rows[0]).toEqual(['1', 'alice', '0.9']);
    expect(preview?.rows[4]).toEqual(['5', 'eve', '0.5']);
  });

  it('handles quoted fields with embedded commas and quotes', () => {
    const csv = 'name,note\n"Smith, John","said ""hi"""\n"Roe, Jane",plain';
    const preview = buildPreviewFromText(csv, 'csv');

    expect(preview?.columns).toEqual(['name', 'note']);
    expect(preview?.rows[0]).toEqual(['Smith, John', 'said "hi"']);
    expect(preview?.rows[1]).toEqual(['Roe, Jane', 'plain']);
  });

  it('pads short rows and ignores empty lines', () => {
    const csv = 'a,b,c\n1,2\n\n3,4,5';
    const preview = buildPreviewFromText(csv, 'csv');

    expect(preview?.rows[0]).toEqual(['1', '2', null]);
    expect(preview?.rows[1]).toEqual(['3', '4', '5']);
  });

  it('skips fully-empty data rows', () => {
    const csv = 'a,b\n,\n1,2';
    const preview = buildPreviewFromText(csv, 'csv');
    expect(preview?.rows).toHaveLength(1);
    expect(preview?.rows[0]).toEqual(['1', '2']);
  });

  it('truncates long cells', () => {
    const long = 'x'.repeat(PREVIEW_MAX_CELL_CHARS + 50);
    const preview = buildPreviewFromText(`k\n${long}`, 'csv');
    const cell = preview?.rows[0][0] ?? '';
    expect(cell.length).toBeLessThanOrEqual(PREVIEW_MAX_CELL_CHARS + 1);
    expect(cell.endsWith('…')).toBe(true);
  });

  it('treats the first line as the header (a headerless CSV is indistinguishable)', () => {
    const preview = buildPreviewFromText('1,2\n3,4', 'csv');
    expect(preview?.columns).toEqual(['1', '2']);
    expect(preview?.rows[0]).toEqual(['3', '4']);
  });
});

describe('buildPreviewFromText — TSV', () => {
  it('uses tab as the delimiter', () => {
    const tsv = 'col_a\tcol_b\n1\tx\n2\ty';
    const preview = buildPreviewFromText(tsv, 'tsv');

    expect(preview?.columns).toEqual(['col_a', 'col_b']);
    expect(preview?.rows).toEqual([
      ['1', 'x'],
      ['2', 'y'],
    ]);
  });
});

describe('buildPreviewFromText — JSON', () => {
  it('flattens an array of objects with first-seen key order', () => {
    const json = JSON.stringify([
      { id: 1, name: 'alice', meta: { x: 1 } },
      { id: 2, name: 'bob' },
      { extra: 'only-in-third', id: 3, name: 'carol' },
    ]);

    const preview = buildPreviewFromText(json, 'json');

    expect(preview?.previewable).toBe(true);
    expect(preview?.columns).toEqual(['id', 'name', 'meta', 'extra']);
    expect(preview?.rows[0]).toEqual(['1', 'alice', '{"x":1}', null]);
    expect(preview?.rows[1]).toEqual(['2', 'bob', null, null]);
  });

  it('treats a single top-level object as one row', () => {
    const preview = buildPreviewFromText('{"key":"value","n":1}', 'json');
    expect(preview?.columns).toEqual(['key', 'n']);
    expect(preview?.rows[0]).toEqual(['value', '1']);
  });

  it('falls back to line-by-line parsing for malformed JSON', () => {
    const text = '{"a":1}\nnot-json\n{"a":2}';
    const preview = buildPreviewFromText(text, 'json');
    expect(preview?.columns).toEqual(['a']);
    expect(preview?.rows).toEqual([['1'], ['2']]);
  });
});

describe('buildPreviewFromText — JSONL', () => {
  it('parses one record per line', () => {
    const jsonl = '{"ts":1,"val":"a"}\n{"ts":2,"val":"b"}\n{"ts":3,"val":"c"}';
    const preview = buildPreviewFromText(jsonl, 'jsonl');

    expect(preview?.columns).toEqual(['ts', 'val']);
    expect(preview?.rows).toEqual([
      ['1', 'a'],
      ['2', 'b'],
      ['3', 'c'],
    ]);
  });
});

describe('buildPreviewFromText — non-tabular', () => {
  it('returns null for text format', () => {
    expect(buildPreviewFromText('just some prose', 'text')).toBeNull();
  });

  it('returns null for unknown formats', () => {
    expect(buildPreviewFromText('a,b\n1,2', 'pdf')).toBeNull();
    expect(buildPreviewFromText('a,b\n1,2', null)).toBeNull();
    expect(buildPreviewFromText('a,b\n1,2', '')).toBeNull();
  });

  it('sniffs CSV/JSON when no format is declared', () => {
    expect(buildPreviewFromText('a,b,c\n1,2,3', null)?.previewable).toBe(true);
    expect(buildPreviewFromText('[{"a":1}]', null)?.previewable).toBe(true);
  });

  it('caps rows at PREVIEW_MAX_ROWS', () => {
    const lines = ['a'];
    for (let i = 0; i < 20; i += 1) lines.push(String(i));
    const preview = buildPreviewFromText(lines.join('\n'), 'csv');
    expect(preview?.rows).toHaveLength(PREVIEW_MAX_ROWS);
  });
});
