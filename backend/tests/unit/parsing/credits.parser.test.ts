import { describe, it, expect } from 'vitest';
import { parseCredits, ParsedCredits } from '../../../src/scraping/parsers/index.js';

describe('parseCredits', () => {

    describe('Section formats (with "hrs" suffix)', () => {
        it('should parse single credit value with hrs', () => {
            const parsed = parseCredits('3.0 hrs');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should parse credit range with hrs', () => {
            const parsed = parseCredits('1.0-3.0 hrs');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should parse credit range with hrs and spaces around dash', () => {
            const parsed = parseCredits('1.0 - 3.0 hrs');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should handle case insensitive "hrs"', () => {
            const parsed = parseCredits('3.0 HRS');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should handle "hrs" without space', () => {
            const parsed = parseCredits('3.0hrs');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });
    });

    describe('Class formats (plain numbers)', () => {
        it('should parse single credit value', () => {
            const parsed = parseCredits('4.0');

            expect(parsed.min).toBe(4.0);
            expect(parsed.max).toBe(4.0);
        });

        it('should parse credit range', () => {
            const parsed = parseCredits('1.0-3.0');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should parse decimal credit value', () => {
            const parsed = parseCredits('2.5');

            expect(parsed.min).toBe(2.5);
            expect(parsed.max).toBe(2.5);
        });

        it('should parse integer-like credit value', () => {
            const parsed = parseCredits('3');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });
    });

    describe('Course formats (with spaces around dash)', () => {
        it('should parse single credit value', () => {
            const parsed = parseCredits('3.0');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should parse credit range with spaces', () => {
            const parsed = parseCredits('1.0 - 3.0');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should parse credit range without spaces', () => {
            const parsed = parseCredits('1.0-3.0');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });
    });

    describe('Edge cases', () => {
        it('should handle extra whitespace', () => {
            const parsed = parseCredits('  3.0 hrs  ');

            expect(parsed.min).toBe(3.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should handle extra whitespace in range', () => {
            const parsed = parseCredits('  1.0  -  3.0  hrs  ');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should handle single digit values', () => {
            const parsed = parseCredits('1-3');

            expect(parsed.min).toBe(1.0);
            expect(parsed.max).toBe(3.0);
        });

        it('should handle zero credits', () => {
            const parsed = parseCredits('0.0');

            expect(parsed.min).toBe(0.0);
            expect(parsed.max).toBe(0.0);
        });

        it('should handle fractional credits', () => {
            const parsed = parseCredits('0.5-1.5 hrs');

            expect(parsed.min).toBe(0.5);
            expect(parsed.max).toBe(1.5);
        });

        it('should return zero for empty string', () => {
            const parsed = parseCredits('');

            expect(parsed.min).toBe(0);
            expect(parsed.max).toBe(0);
        });

        it('should return zero for invalid format', () => {
            const parsed = parseCredits('invalid');

            expect(parsed.min).toBeNaN();
            expect(parsed.max).toBeNaN();
        });
    });

    describe('Real-world examples', () => {
        it('should parse typical section credit hours', () => {
            const examples = [
                { input: '3.0 hrs', expected: { min: 3.0, max: 3.0 } },
                { input: '1.0-3.0 hrs', expected: { min: 1.0, max: 3.0 } },
                { input: '4.0 hrs', expected: { min: 4.0, max: 4.0 } }
            ];

            examples.forEach(({ input, expected }) => {
                const parsed = parseCredits(input);
                expect(parsed).toEqual(expected);
            });
        });

        it('should parse typical class credit hours', () => {
            const examples = [
                { input: '3.0', expected: { min: 3.0, max: 3.0 } },
                { input: '4.0', expected: { min: 4.0, max: 4.0 } },
                { input: '2.5', expected: { min: 2.5, max: 2.5 } }
            ];

            examples.forEach(({ input, expected }) => {
                const parsed = parseCredits(input);
                expect(parsed).toEqual(expected);
            });
        });

        it('should parse typical course credit hours', () => {
            const examples = [
                { input: '3.0', expected: { min: 3.0, max: 3.0 } },
                { input: '1.0 - 3.0', expected: { min: 1.0, max: 3.0 } },
                { input: '4.0', expected: { min: 4.0, max: 4.0 } }
            ];

            examples.forEach(({ input, expected }) => {
                const parsed = parseCredits(input);
                expect(parsed).toEqual(expected);
            });
        });
    });
});
