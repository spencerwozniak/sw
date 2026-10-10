import { test } from 'node:test';
import assert from 'node:assert/strict';
import { convertLegacy, plainTextToState, type LegacyItem } from '../../../scripts/lib/legacy-articles';
import { lexicalPlainText } from '@/lib/richtext/state';

const item = (overrides: Partial<LegacyItem> = {}): LegacyItem => ({
  id: 'my-essay', title: 'My Essay', topic: 'Philosophy', date: 'February 13, 2026', name: 'Spencer Wozniak', contents: '<p>Hello <strong>world</strong>, this is an essay.</p>', keywords: ['one', 'two'], ...overrides,
});

test('an article converts to fields, a body and HTML, and the original is kept', () => {
  const converted = convertLegacy(item(), 'ARTICLE');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.fields.slug, 'my-essay');
  assert.equal(converted.fields.publishedOn.toISOString(), '2026-02-13T00:00:00.000Z');
  assert.equal(converted.fields.author, 'Spencer Wozniak');
  assert.deepEqual(converted.fields.keywords, ['one', 'two']);
  assert.equal(converted.html, '<p>Hello <strong>world</strong>, this is an essay.</p>');
  assert.equal(converted.legacyHtml, '<p>Hello <strong>world</strong>, this is an essay.</p>');
});

test('a publication becomes a DOI link with its abstract as paragraphs', () => {
  const converted = convertLegacy(item({ id: '10.1021/acs.jctc.4c01682', topic: 'Journal of Chemical Theory and Computation', contents: 'First paragraph with 300 g/L & more.\n\nSecond paragraph.', keywords: [] }), 'PUBLICATION');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.fields.slug, null);
  assert.equal(converted.fields.externalUrl, 'https://doi.org/10.1021/acs.jctc.4c01682');
  assert.equal(converted.html, '<p>First paragraph with 300 g/L &amp; more.</p><p>Second paragraph.</p>');
});

test('plain text with single newlines keeps them as line breaks', () => {
  assert.equal(lexicalPlainText(plainTextToState('a\nb\n\nc')).replace(/\n+/g, '|'), 'a|b|c|');
});

test('math, indented passages and stray text convert without losing a word, and are noted', () => {
  const converted = convertLegacy(item({ contents: `<p>Intro text here.</p><p style='margin-left: 20px;font-size:15px;'>A quoted passage here.</p>\\[x^2 + y^2\\]<p>$$E = mc^2$$</p>I turned my gaze<br/>and found it.` }), 'ARTICLE');
  assert.deepEqual(converted.problems, []);
  assert.equal(converted.equations, 2);
  assert.deepEqual(converted.notes.sort(), ['2 equations', 'an indented passage was converted to quote formatting'].sort());
  assert.match(converted.html, /<blockquote><p>A quoted passage here\.<\/p><\/blockquote>/);
  assert.match(converted.html, /<p>I turned my gaze<br>and found it\.<\/p>/);
});

test('a date that is not "Month D, YYYY" is a problem', () => {
  assert.match(convertLegacy(item({ date: '2026-02-13' }), 'ARTICLE').problems.join(' '), /not in "Month D, YYYY" form/);
});

test('an equation that does not render is a problem, so a broken article is never migrated', () => {
  const converted = convertLegacy(item({ contents: '<p>Text before the equation.</p><p>$$\\frac{1}{$$</p>' }), 'ARTICLE');
  assert.match(converted.problems.join(' '), /Equation 1 cannot be displayed/);
});

test('if the conversion would drop text, that is reported (content inside an iframe is discarded)', () => {
  const converted = convertLegacy(item({ contents: '<p>Kept paragraph of text.</p><iframe>hidden words that would be lost</iframe>' }), 'ARTICLE');
  assert.match(converted.problems.join(' '), /converted text is different/);
});

test('an invalid slug or missing title is a problem', () => {
  assert.match(convertLegacy(item({ id: 'Not A Slug' }), 'ARTICLE').problems.join(' '), /lower-case letters/);
  assert.match(convertLegacy(item({ title: '' }), 'ARTICLE').problems.join(' '), /title is required/);
});
