import { describe, it, expect, beforeAll } from 'vitest';
import { parseCourse } from '../../../src/ingestion/parsers/index.js';
import { CatalogCourse } from '../../../src/ingestion/scrapers/types/course.type.js';

describe('parseCourse', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY must be set to run integration tests');
        }
    });

    describe('Complete course parsing', () => {
        it('should parse a course with single credit value and prerequisites', async () => {
            const course: CatalogCourse = {
                id: 'CS 1101',
                subject: 'CS',
                abbreviation: '1101',
                name: 'Programming and Problem Solving',
                details: {
                    school: 'School of Engineering',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    typicallyOffered: 'Fall, Spring',
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences', 'CORE: Quantitative Reasoning'],
                    description: 'Introduction to programming and algorithmic problem solving. Topics include data types, control structures, functions, arrays, and basic algorithms. Prerequisite: MATH 1300 or equivalent. [3] (MNS)'
                }
            };

            const parsed = await parseCourse(course);

            // Basic fields should be preserved
            expect(parsed.id).toBe('CS 1101');
            expect(parsed.subject).toBe('CS');
            expect(parsed.abbreviation).toBe('1101');
            expect(parsed.name).toBe('Programming and Problem Solving');

            // Details fields
            expect(parsed.details.school).toBe('School of Engineering');
            expect(parsed.details.typicallyOffered).toBe('Fall, Spring');
            expect(parsed.details.description).toBe(course.details.description);

            // Parsed credits
            expect(parsed.details.credits.min).toBe(3.0);
            expect(parsed.details.credits.max).toBe(3.0);

            // Parsed attributes
            expect(parsed.details.attributes.axle).toEqual(['AXLE: Mathematics and Natural Sciences']);
            expect(parsed.details.attributes.core).toEqual(['CORE: Quantitative Reasoning']);

            // Parsed requirements (from AI)
            expect(parsed.details.requirements).toBeTruthy();
            expect(parsed.details.requirements.prerequisites).toBeTruthy();
            expect(parsed.details.requirements.corequisites).toBeTruthy();
        }, 30000); // 30 second timeout for API call

        it('should parse a course with credit range and complex prerequisites', async () => {
            const course: CatalogCourse = {
                id: 'PHYS 2210',
                subject: 'PHYS',
                abbreviation: '2210',
                name: 'Optics',
                details: {
                    school: 'College of Arts and Science',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    typicallyOffered: 'Fall',
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences'],
                    description: 'Geometrical optics, including reflection, refraction, ray tracing, and aberrations. Physical optics, including wave theory, absorption, dispersion, diffraction, and polarization. Quantum optics, including photon theory, lasers, entanglement, teleportation, and the statistics of quantum noise in optical signaling. No credit for students who have earned credit for 5210. Prerequisite: either 1502 or 1602 or 1912; and either MATH 1201 or 1301. [3] (MNS)'
                }
            };

            const parsed = await parseCourse(course);

            // Basic fields
            expect(parsed.id).toBe('PHYS 2210');
            expect(parsed.subject).toBe('PHYS');

            // Parsed credits
            expect(parsed.details.credits.min).toBe(3.0);
            expect(parsed.details.credits.max).toBe(3.0);

            // Parsed attributes
            expect(parsed.details.attributes.axle).toEqual(['AXLE: Mathematics and Natural Sciences']);
            expect(parsed.details.attributes.core).toBeNull();

            // Complex prerequisites should be parsed
            expect(parsed.details.requirements.prerequisites.rawText).toBeTruthy();
            expect(parsed.details.requirements.prerequisites.rawText).toContain('Prerequisite');

            // Should have $and structure with nested $or
            const prereqCourses = parsed.details.requirements.prerequisites.courses;
            if (prereqCourses && typeof prereqCourses === 'object' && '$and' in prereqCourses) {
                expect(prereqCourses.$and).toBeInstanceOf(Array);
                expect(prereqCourses.$and.length).toBeGreaterThan(0);
            }
        }, 30000);

        it('should parse a course with variable credits', async () => {
            const course: CatalogCourse = {
                id: 'MUSL 1220',
                subject: 'MUSL',
                abbreviation: '1220',
                name: 'Private Instruction',
                details: {
                    school: 'Blair School of Music',
                    hours: '1.0 - 3.0',
                    grading: 'Letter Grade',
                    components: ['Private Instruction'],
                    typicallyOffered: 'Fall, Spring',
                    requirements: null,
                    attributes: [],
                    description: 'Private lessons in various instruments and voice. May be repeated for credit. [1-3] (No AXLE credit)'
                }
            };

            const parsed = await parseCourse(course);

            // Variable credits should be parsed correctly
            expect(parsed.details.credits.min).toBe(1.0);
            expect(parsed.details.credits.max).toBe(3.0);

            // Empty attributes should return null
            expect(parsed.details.attributes.axle).toBeNull();
            expect(parsed.details.attributes.core).toBeNull();
        }, 30000);

        it('should handle course with no prerequisites', async () => {
            const course: CatalogCourse = {
                id: 'ENGL 1100',
                subject: 'ENGL',
                abbreviation: '1100',
                name: 'Composition and Rhetoric',
                details: {
                    school: 'College of Arts and Science',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    typicallyOffered: 'Fall, Spring',
                    requirements: null,
                    attributes: ['AXLE: Writing'],
                    description: 'Introduction to academic writing and critical thinking. Focuses on rhetorical strategies, argumentation, and research skills. [3] (Writing)'
                }
            };

            const parsed = await parseCourse(course);

            // Should parse successfully even without prerequisites
            expect(parsed.id).toBe('ENGL 1100');

            // Requirements should have null values for no prerequisites/corequisites
            expect(parsed.details.requirements.prerequisites.rawText).toBeNull();
            expect(parsed.details.requirements.prerequisites.courses).toBeNull();
            expect(parsed.details.requirements.corequisites.rawText).toBeNull();
            expect(parsed.details.requirements.corequisites.courses).toBeNull();
        }, 30000);

        it('should handle course with corequisites', async () => {
            const course: CatalogCourse = {
                id: 'PHYS 3200',
                subject: 'PHYS',
                abbreviation: '3200',
                name: 'Thermodynamics',
                details: {
                    school: 'College of Arts and Science',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    typicallyOffered: 'Spring',
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences'],
                    description: 'Temperature, work, heat, and the first law of thermodynamics. Entropy and the second law of thermodynamics. Kinetic theory of gases with applications to ideal gases and electromagnetic radiation. Serves as repeat credit for students who have completed 3207. Prerequisite or corequisite: 2270 or 2275. [3] (MNS)'
                }
            };

            const parsed = await parseCourse(course);

            // Should extract corequisites
            expect(parsed.details.requirements.corequisites.rawText).toBeTruthy();
            expect(parsed.details.requirements.corequisites.rawText).toContain('corequisite');
            expect(parsed.details.requirements.corequisites.courses).toBeTruthy();
        }, 30000);
    });

    describe('Edge cases', () => {
        it('should handle null/empty fields gracefully', async () => {
            const course: CatalogCourse = {
                id: 'TEST 1000',
                subject: 'TEST',
                abbreviation: '1000',
                name: 'Test Course',
                details: {
                    school: null,
                    hours: null,
                    grading: null,
                    components: [],
                    typicallyOffered: null,
                    requirements: null,
                    attributes: [],
                    description: null
                }
            };

            const parsed = await parseCourse(course);

            // Should handle nulls without crashing
            expect(parsed.id).toBe('TEST 1000');
            expect(parsed.details.school).toBeNull();
            expect(parsed.details.credits.min).toBe(0);
            expect(parsed.details.credits.max).toBe(0);
            expect(parsed.details.attributes.axle).toBeNull();
            expect(parsed.details.attributes.core).toBeNull();
            expect(parsed.details.requirements.prerequisites.rawText).toBeNull();
        }, 30000);
    });
});
