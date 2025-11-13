import { describe, it, expect, beforeAll } from 'vitest';
import { parseRequirements } from '../../../src/ingestion/parsers/index.js';

/**
 * Integration tests that actually call the Gemini API
 * These tests require GEMINI_API_KEY environment variable to be set
 *
 * To run only these tests:
 * npm test -- requirements.parser.integration.test.ts
 */

describe('parseRequirements - Integration Tests', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY must be set to run integration tests');
        }
    });

    describe('Real API calls', () => {
        it('should parse simple OR prerequisites from PHYS 2255 description', async () => {
            const result = await parseRequirements(
                'PHYS 2255',
                'Relativity. Experimental basis of quantum physics. Structure of the atom. Wave properties of matter. The hydrogen atom. Atomic and statistical physics. Prerequisite: either 1502, 1602, 1902 (or 1912), or 2053. Corequisite: MATH 2300 or 2500. [3] (MNS)'
            );

            // Should extract prerequisites
            expect(result.prerequisites.rawText).toBeTruthy();
            expect(result.prerequisites.rawText).toContain('Prerequisite');
            expect(result.prerequisites.courses).toBeTruthy();

            // Should be an $or structure with PHYS courses
            if (result.prerequisites.courses && typeof result.prerequisites.courses === 'object' && '$or' in result.prerequisites.courses) {
                const courses = result.prerequisites.courses.$or;
                expect(courses).toBeInstanceOf(Array);
                expect(courses.some(c => typeof c === 'string' && c.includes('PHYS'))).toBe(true);
            }

            // Should extract corequisites
            expect(result.corequisites.rawText).toBeTruthy();
            expect(result.corequisites.rawText).toContain('Corequisite');
            expect(result.corequisites.courses).toBeTruthy();

            // Should be an $or structure with MATH courses
            if (result.corequisites.courses && typeof result.corequisites.courses === 'object' && '$or' in result.corequisites.courses) {
                const courses = result.corequisites.courses.$or;
                expect(courses).toBeInstanceOf(Array);
                expect(courses.some(c => typeof c === 'string' && c.includes('MATH'))).toBe(true);
            }
        }, 30000); // 30 second timeout for API call

        it('should parse complex nested prerequisites from PHYS 2953L', async () => {
            const result = await parseRequirements(
                'PHYS 2953L',
                'Fundamental physics experiments and measurements. Statistical analysis of measured data. One laboratory per week. Prerequisite: 2255L, and either 2255 or 3651; or 1912 and either 2255 or 3651; or either 2250W or 2260W. [1] (No AXLE credit)'
            );

            // Should extract prerequisites with complex structure
            expect(result.prerequisites.rawText).toBeTruthy();
            expect(result.prerequisites.rawText).toContain('Prerequisite');
            expect(result.prerequisites.courses).toBeTruthy();

            // Should be an $or at the top level with nested $and structures
            if (result.prerequisites.courses && typeof result.prerequisites.courses === 'object' && '$or' in result.prerequisites.courses) {
                const topLevel = result.prerequisites.courses.$or;
                expect(topLevel).toBeInstanceOf(Array);
                expect(topLevel.length).toBeGreaterThan(0);
            }

            // Should have no corequisites
            expect(result.corequisites.rawText).toBeNull();
            expect(result.corequisites.courses).toBeNull();
        }, 30000);

        it('should parse AND with nested OR from PHYS 2210', async () => {
            const result = await parseRequirements(
                'PHYS 2210',
                'Geometrical optics, including reflection, refraction, ray tracing, and aberrations. Physical optics, including wave theory, absorption, dispersion, diffraction, and polarization. Quantum optics, including photon theory, lasers, entanglement, teleportation, and the statistics of quantum noise in optical signaling. No credit for students who have earned credit for 5210. Prerequisite: either 1502 or 1602 or 1912; and either MATH 1201 or 1301. [3] (MNS)'
            );

            // Should extract prerequisites
            expect(result.prerequisites.rawText).toBeTruthy();
            expect(result.prerequisites.rawText).toContain('Prerequisite');
            expect(result.prerequisites.courses).toBeTruthy();

            // Should be an $and at the top level
            if (result.prerequisites.courses && typeof result.prerequisites.courses === 'object' && '$and' in result.prerequisites.courses) {
                const andClauses = result.prerequisites.courses.$and;
                expect(andClauses).toBeInstanceOf(Array);
                expect(andClauses.length).toBe(2); // Two parts joined by AND

                // Each part should be an $or
                andClauses.forEach(clause => {
                    if (typeof clause === 'object' && '$or' in clause) {
                        expect(clause.$or).toBeInstanceOf(Array);
                    }
                });
            }

            // Should have no corequisites
            expect(result.corequisites.rawText).toBeNull();
            expect(result.corequisites.courses).toBeNull();
        }, 30000);

        it('should handle "prerequisite or corequisite" as corequisite from PHYS 3200', async () => {
            const result = await parseRequirements(
                'PHYS 3200',
                'Temperature, work, heat, and the first law of thermodynamics. Entropy and the second law of thermodynamics. Kinetic theory of gases with applications to ideal gases and electromagnetic radiation. Serves as repeat credit for students who have completed 3207. Prerequisite or corequisite: 2270 or 2275. [3] (MNS)'
            );

            // Should have no prerequisites
            expect(result.prerequisites.rawText).toBeNull();
            expect(result.prerequisites.courses).toBeNull();

            // Should extract as corequisite (not prerequisite)
            expect(result.corequisites.rawText).toBeTruthy();
            expect(result.corequisites.rawText).toContain('Prerequisite or corequisite');
            expect(result.corequisites.courses).toBeTruthy();

            // Should be an $or structure
            if (result.corequisites.courses && typeof result.corequisites.courses === 'object' && '$or' in result.corequisites.courses) {
                const courses = result.corequisites.courses.$or;
                expect(courses).toBeInstanceOf(Array);
                expect(courses.some(c => typeof c === 'string' && c.includes('PHYS'))).toBe(true);
            }
        }, 30000);

        it('should return null courses for course with no requirements', async () => {
            const result = await parseRequirements(
                'CS 1101',
                'Introduction to programming and problem solving. Students will learn fundamental concepts of computer science and acquire programming skills using a high-level language. No prerequisites required.'
            );

            // The most important check: courses should be null (no actual course requirements)
            // rawText might contain "No prerequisites required" but courses should be null
            expect(result.prerequisites.courses).toBeNull();
            expect(result.corequisites.courses).toBeNull();
        }, 30000);

        it('should infer subject code from course code', async () => {
            const result = await parseRequirements(
                'MATH 2300',
                'Introduction to multivariable calculus. Prerequisite: 1301 or permission of instructor.'
            );

            // Should extract prerequisites
            expect(result.prerequisites.rawText).toBeTruthy();
            expect(result.prerequisites.courses).toBeTruthy();

            // Should infer MATH as the subject for 1301
            const coursesStr = JSON.stringify(result.prerequisites.courses);
            expect(coursesStr).toContain('MATH');
            expect(coursesStr).toContain('1301');
        }, 30000);

        it('should handle multiple different subject codes correctly', async () => {
            const result = await parseRequirements(
                'CS 3250',
                'Algorithms and data structures. Prerequisite: CS 2201 and either MATH 2300 or MATH 2810.'
            );

            // Should extract prerequisites
            expect(result.prerequisites.rawText).toBeTruthy();
            expect(result.prerequisites.courses).toBeTruthy();

            // Should have both CS and MATH courses
            const coursesStr = JSON.stringify(result.prerequisites.courses);
            expect(coursesStr).toContain('CS');
            expect(coursesStr).toContain('MATH');
        }, 30000);
    });
});
