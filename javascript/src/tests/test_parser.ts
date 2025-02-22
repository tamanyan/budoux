/**
 * @license
 * Copyright 2021 Google LLC
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {parseFromString} from '../dom.js';
import {Parser} from '../parser.js';

describe('Parser.parse', () => {
  const TEST_SENTENCE = 'abcdeabcd';

  it('should separate if a strong feature item supports.', () => {
    const model = {
      UW4: {a: 10000}, // means "should separate right before 'a'".
    };
    const parser = new Parser(model);
    const result = parser.parse(TEST_SENTENCE);
    expect(result).toEqual(['abcde', 'abcd']);
  });

  it('should separate even if it makes a phrase of one character.', () => {
    const model = {
      UW4: {b: 10000}, // means "should separate right before 'b'".
    };
    const parser = new Parser(model);
    const result = parser.parse(TEST_SENTENCE);
    expect(result).toEqual(['a', 'bcdea', 'bcd']);
  });

  it('should return an empty list when the input is a blank string.', () => {
    const parser = new Parser({});
    const result = parser.parse('');
    expect(result).toEqual([]);
  });
});

describe('Parser.applyElement', () => {
  const checkEqual = (
    model: {[key: string]: {[key: string]: number}},
    inputHTML: string,
    expectedHTML: string
  ) => {
    const inputDOM = parseFromString(inputHTML);
    const inputDocument = inputDOM.querySelector('p') as HTMLElement;
    const parser = new Parser(model);
    parser.applyElement(inputDocument);
    const expectedDocument = parseFromString(expectedHTML);
    const expectedElement = expectedDocument.querySelector('p') as HTMLElement;
    expect(inputDocument.isEqualNode(expectedElement)).toBeTrue();
  };

  it('should insert WBR tags where the sentence should break.', () => {
    const inputHTML = '<p>xyzabcabc</p>';
    const expectedHTML = `
    <p style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<wbr>abc<wbr>abc</p>`;
    const model = {
      UW4: {a: 1001}, // means "should separate right before 'a'".
    };
    checkEqual(model, inputHTML, expectedHTML);
  });

  it('should insert WBR tags even it overlaps with other HTML tags.', () => {
    const inputHTML = '<p>xy<a href="#">zabca</a>bc</p>';
    const expectedHTML = `<p style="word-break: keep-all; overflow-wrap: break-word;"
    >xy<a href="#">z<wbr>abc<wbr>a</a>bc</p>`;
    const model = {
      UW4: {a: 1001}, // means "should separate right before 'a'".
    };
    checkEqual(model, inputHTML, expectedHTML);
  });
});

describe('Parser.translateHTMLString', () => {
  const defaultModel = {
    UW4: {a: 1001}, // means "should separate right before 'a'".
  };
  const checkEqual = (
    model: {[key: string]: {[key: string]: number}},
    inputHTML: string,
    expectedHTML: string
  ) => {
    const parser = new Parser(model);
    const result = parser.translateHTMLString(inputHTML);
    const resultDocument = parseFromString(result);
    const expectedDocument = parseFromString(expectedHTML);
    expect(resultDocument.isEqualNode(expectedDocument)).toBeTrue();
  };

  it('should output a html string with a SPAN parent with proper style attributes.', () => {
    const inputHTML = 'xyzabcd';
    const expectedHTML = `
    <span style="word-break: keep-all; overflow-wrap: break-word;">xyz<wbr>abcd</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('should not add a SPAN parent if the input already has one single parent.', () => {
    const inputHTML = '<p class="foo" style="color: red">xyzabcd</p>';
    const expectedHTML = `
    <p class="foo"
       style="color: red; word-break: keep-all; overflow-wrap: break-word;"
    >xyz<wbr>abcd</p>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('should return a blank string if the input is blank.', () => {
    const inputHTML = '';
    const expectedHTML = '';
    checkEqual({}, inputHTML, expectedHTML);
  });

  it('should pass script tags as-is.', () => {
    const inputHTML = 'xyz<script>alert(1);</script>xyzabc';
    const expectedHTML = `<span
    style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<script>alert(1);</script>xyz<wbr>abc</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('script tags on top should be discarded by the DOMParser.', () => {
    const inputHTML = '<script>alert(1);</script>xyzabc';
    const expectedHTML = `<span
    style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<wbr>abc</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('should skip some specific tags.', () => {
    const inputHTML = 'xyz<code>abc</code>abc';
    const expectedHTML = `<span
    style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<code>abc</code><wbr>abc</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('should not ruin attributes of child elements.', () => {
    const inputHTML = 'xyza<a href="#" hidden>bc</a>abc';
    const expectedHTML = `<span
    style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<wbr>a<a href="#" hidden>bc</a><wbr>abc</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });

  it('should work with emojis.', () => {
    const inputHTML = 'xyza🇯🇵🇵🇹abc';
    const expectedHTML = `<span
    style="word-break: keep-all; overflow-wrap: break-word;"
    >xyz<wbr>a🇯🇵🇵🇹<wbr>abc</span>`;
    checkEqual(defaultModel, inputHTML, expectedHTML);
  });
});
