import { describe, it, expect } from 'vitest';
import { parseAttributes, ParsedAttributes } from '../../../src/ingestion/parsers/index.js';

describe('parseAttributes', () => {

    describe('AXLE attributes', () => {
        it('should parse single AXLE attribute', () => {
            const parsed = parseAttributes(['AXLE: Math and Natural Sciences']);

            expect(parsed.axle).toEqual(['AXLE: Math and Natural Sciences']);
            expect(parsed.core).toBeNull();
        });

        it('should parse multiple AXLE attributes', () => {
            const parsed = parseAttributes([
                'AXLE: Math and Natural Sciences',
                'AXLE: HCA'
            ]);

            expect(parsed.axle).toHaveLength(2);
            expect(parsed.axle).toContain('AXLE: Math and Natural Sciences');
            expect(parsed.axle).toContain('AXLE: HCA');
            expect(parsed.core).toBeNull();
        });

        it('should handle AXLE with different content', () => {
            const parsed = parseAttributes([
                'AXLE: Social and Behavioral Sciences',
                'AXLE: International Cultures'
            ]);

            expect(parsed.axle).toHaveLength(2);
            expect(parsed.core).toBeNull();
        });
    });

    describe('Core attributes', () => {
        it('should parse single CORE attribute', () => {
            const parsed = parseAttributes(['CORE: B-Systemic & Structural Reasoning']);

            expect(parsed.core).toEqual(['CORE: B-Systemic & Structural Reasoning']);
            expect(parsed.axle).toBeNull();
        });

        it('should parse LE (Liberal Education) attribute', () => {
            const parsed = parseAttributes(['LE: MNS-Math and Natural Sciences']);

            expect(parsed.core).toEqual(['LE: MNS-Math and Natural Sciences']);
            expect(parsed.axle).toBeNull();
        });

        it('should parse LA- attribute', () => {
            const parsed = parseAttributes(['LA- Liberal Arts']);

            expect(parsed.core).toEqual(['LA- Liberal Arts']);
            expect(parsed.axle).toBeNull();
        });

        it('should parse LB- attribute', () => {
            const parsed = parseAttributes(['LB- Liberal Basic']);

            expect(parsed.core).toEqual(['LB- Liberal Basic']);
            expect(parsed.axle).toBeNull();
        });

        it('should parse multiple core attributes', () => {
            const parsed = parseAttributes([
                'CORE: B-Systemic & Structural Reasoning',
                'LE: MNS-Math and Natural Sciences'
            ]);

            expect(parsed.core).toHaveLength(2);
            expect(parsed.core).toContain('CORE: B-Systemic & Structural Reasoning');
            expect(parsed.core).toContain('LE: MNS-Math and Natural Sciences');
            expect(parsed.axle).toBeNull();
        });
    });

    describe('Mixed attributes', () => {
        it('should parse both AXLE and CORE attributes', () => {
            const parsed = parseAttributes([
                'CORE: B-Systemic & Structural Reasoning',
                'LE: MNS-Math and Natural Sciences',
                'AXLE: Math and Natural Sciences'
            ]);

            expect(parsed.core).toHaveLength(2);
            expect(parsed.core).toContain('CORE: B-Systemic & Structural Reasoning');
            expect(parsed.core).toContain('LE: MNS-Math and Natural Sciences');
            expect(parsed.axle).toHaveLength(1);
            expect(parsed.axle).toContain('AXLE: Math and Natural Sciences');
        });

        it('should parse multiple AXLE and multiple CORE attributes', () => {
            const parsed = parseAttributes([
                'AXLE: Math and Natural Sciences',
                'AXLE: HCA',
                'CORE: B-Systemic & Structural Reasoning',
                'LE: MNS-Math and Natural Sciences',
                'LA- Liberal Arts'
            ]);

            expect(parsed.axle).toHaveLength(2);
            expect(parsed.core).toHaveLength(3);
        });
    });

    describe('Edge cases', () => {
        it('should handle empty array', () => {
            const parsed = parseAttributes([]);

            expect(parsed.axle).toBeNull();
            expect(parsed.core).toBeNull();
        });

        it('should handle null input', () => {
            const parsed = parseAttributes(null as any);

            expect(parsed.axle).toBeNull();
            expect(parsed.core).toBeNull();
        });

        it('should handle undefined input', () => {
            const parsed = parseAttributes(undefined as any);

            expect(parsed.axle).toBeNull();
            expect(parsed.core).toBeNull();
        });

        it('should handle attributes with extra whitespace', () => {
            const parsed = parseAttributes([
                '  AXLE: Math and Natural Sciences  ',
                '  CORE: B-Systemic & Structural Reasoning  '
            ]);

            expect(parsed.axle).toEqual(['AXLE: Math and Natural Sciences']);
            expect(parsed.core).toEqual(['CORE: B-Systemic & Structural Reasoning']);
        });

        it('should ignore attributes that do not match any prefix', () => {
            const parsed = parseAttributes([
                'AXLE: Math and Natural Sciences',
                'Some Other Attribute',
                'CORE: B-Systemic & Structural Reasoning'
            ]);

            expect(parsed.axle).toHaveLength(1);
            expect(parsed.core).toHaveLength(1);
        });

        it('should handle empty strings in array', () => {
            const parsed = parseAttributes([
                'AXLE: Math and Natural Sciences',
                '',
                'CORE: B-Systemic & Structural Reasoning'
            ]);

            expect(parsed.axle).toHaveLength(1);
            expect(parsed.core).toHaveLength(1);
        });

        it('should handle only invalid attributes', () => {
            const parsed = parseAttributes([
                'Invalid Attribute 1',
                'Invalid Attribute 2'
            ]);

            expect(parsed.axle).toBeNull();
            expect(parsed.core).toBeNull();
        });
    });

    describe('Real-world examples from course catalog', () => {
        it('should parse Math 1301 attributes', () => {
            const parsed = parseAttributes([
                'CORE: B-Systemic & Structural Reasoning',
                'LE: MNS-Math and Natural Sciences',
                'AXLE: Math and Natural Sciences'
            ]);

            expect(parsed.core).toHaveLength(2);
            expect(parsed.core).toContain('CORE: B-Systemic & Structural Reasoning');
            expect(parsed.core).toContain('LE: MNS-Math and Natural Sciences');
            expect(parsed.axle).toHaveLength(1);
            expect(parsed.axle).toContain('AXLE: Math and Natural Sciences');
        });

        it('should parse attributes with HTML entities decoded', () => {
            const parsed = parseAttributes([
                'CORE: B-Systemic & Structural Reasoning'
            ]);

            expect(parsed.core).toEqual(['CORE: B-Systemic & Structural Reasoning']);
            expect(parsed.core?.[0]).toContain('&');
            expect(parsed.core?.[0]).not.toContain('&amp;');
        });

        it('should handle course with only AXLE attributes', () => {
            const parsed = parseAttributes([
                'AXLE: Social and Behavioral Sciences',
                'AXLE: United States History and Culture'
            ]);

            expect(parsed.axle).toHaveLength(2);
            expect(parsed.core).toBeNull();
        });

        it('should handle course with only CORE attributes', () => {
            const parsed = parseAttributes([
                'CORE: A-Aesthetic and Creative Experience',
                'LE: HCA-History and Culture of the Arts'
            ]);

            expect(parsed.core).toHaveLength(2);
            expect(parsed.axle).toBeNull();
        });
    });
});
