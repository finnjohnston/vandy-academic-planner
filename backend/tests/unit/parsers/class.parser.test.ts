import { describe, it, expect, beforeAll } from 'vitest';
import { parseClass } from '../../../src/ingestion/parsers/index.js';
import { SemesterClass } from '../../../src/ingestion/scrapers/types/class.type.js';

describe('parseClass', () => {
    beforeAll(() => {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY must be set to run integration tests');
        }
    });

    describe('Complete class parsing', () => {
        it('should parse a class with single credit value and prerequisites', async () => {
            const semesterClass: SemesterClass = {
                id: 'CS 2201',
                termId: '1040',
                subject: 'CS',
                abbreviation: '2201',
                name: 'Data Structures',
                details: {
                    school: 'School of Engineering',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences'],
                    description: 'Abstract data types; advanced procedural and data abstraction; encapsulation; object-oriented programming. Lists, stacks, queues, trees, hashing, tables, graphs. Analysis and comparative evaluation of algorithms. Prerequisite: CS 1101. [3] (MNS)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Basic fields should be preserved
            expect(parsed.id).toBe('CS 2201');
            expect(parsed.termId).toBe('1040');
            expect(parsed.subject).toBe('CS');
            expect(parsed.abbreviation).toBe('2201');
            expect(parsed.name).toBe('Data Structures');

            // Details fields
            expect(parsed.details.school).toBe('School of Engineering');
            expect(parsed.details.description).toBe(semesterClass.details.description);

            // Parsed credits
            expect(parsed.details.credits.min).toBe(3.0);
            expect(parsed.details.credits.max).toBe(3.0);

            // Parsed attributes
            expect(parsed.details.attributes.axle).toEqual(['AXLE: Mathematics and Natural Sciences']);
            expect(parsed.details.attributes.core).toBeNull();

            // Parsed requirements (from AI)
            expect(parsed.details.requirements).toBeTruthy();
            expect(parsed.details.requirements.prerequisites).toBeTruthy();
            expect(parsed.details.requirements.corequisites).toBeTruthy();

            // Should find CS 1101 as prerequisite
            if (parsed.details.requirements.prerequisites.rawText) {
                expect(parsed.details.requirements.prerequisites.rawText).toContain('CS 1101');
            }
        }, 30000); // 30 second timeout for API call

        it('should parse a class with complex prerequisites', async () => {
            const semesterClass: SemesterClass = {
                id: 'PHYS 2953L',
                termId: '1040',
                subject: 'PHYS',
                abbreviation: '2953L',
                name: 'Modern Physics Laboratory',
                details: {
                    school: 'College of Arts and Science',
                    hours: '1.0',
                    grading: 'Letter Grade',
                    components: ['Laboratory'],
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences'],
                    description: 'Fundamental physics experiments and measurements. Statistical analysis of measured data. One laboratory per week. Prerequisite: 2255L, and either 2255 or 3651; or 1912 and either 2255 or 3651; or either 2250W or 2260W. [1] (No AXLE credit)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Basic fields
            expect(parsed.id).toBe('PHYS 2953L');
            expect(parsed.subject).toBe('PHYS');

            // Parsed credits
            expect(parsed.details.credits.min).toBe(1.0);
            expect(parsed.details.credits.max).toBe(1.0);

            // Complex prerequisites should be parsed
            expect(parsed.details.requirements.prerequisites.rawText).toBeTruthy();
            expect(parsed.details.requirements.prerequisites.rawText).toContain('Prerequisite');

            // Should have $or structure with nested $and
            const prereqCourses = parsed.details.requirements.prerequisites.courses;
            if (prereqCourses && typeof prereqCourses === 'object' && '$or' in prereqCourses) {
                expect(prereqCourses.$or).toBeInstanceOf(Array);
                expect(prereqCourses.$or.length).toBeGreaterThan(0);
            }
        }, 30000);

        it('should parse a class with variable credits', async () => {
            const semesterClass: SemesterClass = {
                id: 'CS 3860',
                termId: '1040',
                subject: 'CS',
                abbreviation: '3860',
                name: 'Independent Study',
                details: {
                    school: 'School of Engineering',
                    hours: '1.0-3.0',
                    grading: 'Pass/Fail',
                    components: ['Independent Study'],
                    requirements: null,
                    attributes: [],
                    description: 'Individual directed study in areas not covered by regular courses. Requires approval from supervising faculty member. May be repeated for credit. [1-3] (No AXLE credit)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Variable credits should be parsed correctly
            expect(parsed.details.credits.min).toBe(1.0);
            expect(parsed.details.credits.max).toBe(3.0);

            // Empty attributes should return null
            expect(parsed.details.attributes.axle).toBeNull();
            expect(parsed.details.attributes.core).toBeNull();
        }, 30000);

        it('should handle class with no prerequisites', async () => {
            const semesterClass: SemesterClass = {
                id: 'HOD 1100',
                termId: '1040',
                subject: 'HOD',
                abbreviation: '1100',
                name: 'Human and Organizational Development',
                details: {
                    school: 'Peabody College',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    requirements: null,
                    attributes: ['AXLE: Social and Behavioral Sciences'],
                    description: 'Introduction to human and organizational development. Explores theories of learning, motivation, and change in individual and organizational contexts. [3] (SBS)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Should parse successfully even without prerequisites
            expect(parsed.id).toBe('HOD 1100');

            // Requirements should have null values for no prerequisites/corequisites
            expect(parsed.details.requirements.prerequisites.rawText).toBeNull();
            expect(parsed.details.requirements.prerequisites.courses).toBeNull();
            expect(parsed.details.requirements.corequisites.rawText).toBeNull();
            expect(parsed.details.requirements.corequisites.courses).toBeNull();
        }, 30000);

        it('should handle class with both prerequisites and corequisites', async () => {
            const semesterClass: SemesterClass = {
                id: 'PHYS 2255',
                termId: '1040',
                subject: 'PHYS',
                abbreviation: '2255',
                name: 'Modern Physics',
                details: {
                    school: 'College of Arts and Science',
                    hours: '3.0',
                    grading: 'Letter Grade',
                    components: ['Lecture'],
                    requirements: null,
                    attributes: ['AXLE: Mathematics and Natural Sciences'],
                    description: 'Relativity. Experimental basis of quantum physics. Structure of the atom. Wave properties of matter. The hydrogen atom. Atomic and statistical physics. Prerequisite: either 1502, 1602, 1902 (or 1912), or 2053. Corequisite: MATH 2300 or 2500. [3] (MNS)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Should extract both prerequisites and corequisites
            expect(parsed.details.requirements.prerequisites.rawText).toBeTruthy();
            expect(parsed.details.requirements.prerequisites.rawText).toContain('Prerequisite');
            expect(parsed.details.requirements.prerequisites.courses).toBeTruthy();

            expect(parsed.details.requirements.corequisites.rawText).toBeTruthy();
            expect(parsed.details.requirements.corequisites.rawText).toContain('Corequisite');
            expect(parsed.details.requirements.corequisites.courses).toBeTruthy();

            // Prerequisites should have $or structure with PHYS courses
            const prereqCourses = parsed.details.requirements.prerequisites.courses;
            if (prereqCourses && typeof prereqCourses === 'object' && '$or' in prereqCourses) {
                const courses = prereqCourses.$or;
                expect(courses).toBeInstanceOf(Array);
                expect(courses.some(c => typeof c === 'string' && c.includes('PHYS'))).toBe(true);
            }

            // Corequisites should have $or structure with MATH courses
            const coreqCourses = parsed.details.requirements.corequisites.courses;
            if (coreqCourses && typeof coreqCourses === 'object' && '$or' in coreqCourses) {
                const courses = coreqCourses.$or;
                expect(courses).toBeInstanceOf(Array);
                expect(courses.some(c => typeof c === 'string' && c.includes('MATH'))).toBe(true);
            }
        }, 30000);

        it('should handle class with multiple attribute types', async () => {
            const semesterClass: SemesterClass = {
                id: 'BSCI 1100',
                termId: '1040',
                subject: 'BSCI',
                abbreviation: '1100',
                name: 'General Biology',
                details: {
                    school: 'College of Arts and Science',
                    hours: '4.0',
                    grading: 'Letter Grade',
                    components: ['Lecture', 'Laboratory'],
                    requirements: null,
                    attributes: [
                        'AXLE: Mathematics and Natural Sciences',
                        'CORE: Life Sciences',
                        'LA-Scientific Inquiry'
                    ],
                    description: 'Introduction to biology covering cell structure, genetics, evolution, and ecology. Includes weekly laboratory sessions. [4] (MNS)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Should parse multiple attribute types
            expect(parsed.details.attributes.axle).toEqual(['AXLE: Mathematics and Natural Sciences']);
            expect(parsed.details.attributes.core).toEqual(['CORE: Life Sciences', 'LA-Scientific Inquiry']);
        }, 30000);
    });

    describe('Edge cases', () => {
        it('should handle null/empty fields gracefully', async () => {
            const semesterClass: SemesterClass = {
                id: 'TEST 2000',
                termId: '1040',
                subject: 'TEST',
                abbreviation: '2000',
                name: 'Test Class',
                details: {
                    school: null,
                    hours: null,
                    grading: null,
                    components: [],
                    requirements: null,
                    attributes: [],
                    description: null
                }
            };

            const parsed = await parseClass(semesterClass);

            // Should handle nulls without crashing
            expect(parsed.id).toBe('TEST 2000');
            expect(parsed.details.school).toBeNull();
            expect(parsed.details.credits.min).toBe(0);
            expect(parsed.details.credits.max).toBe(0);
            expect(parsed.details.attributes.axle).toBeNull();
            expect(parsed.details.attributes.core).toBeNull();
            expect(parsed.details.requirements.prerequisites.rawText).toBeNull();
        }, 30000);

        it('should handle empty hours string', async () => {
            const semesterClass: SemesterClass = {
                id: 'MUS 1000',
                termId: '1040',
                subject: 'MUS',
                abbreviation: '1000',
                name: 'Music Ensemble',
                details: {
                    school: 'Blair School of Music',
                    hours: '',
                    grading: 'Pass/Fail',
                    components: ['Ensemble'],
                    requirements: null,
                    attributes: [],
                    description: 'Participation in a music ensemble. May be repeated for credit. [0-1] (No AXLE credit)'
                }
            };

            const parsed = await parseClass(semesterClass);

            // Empty hours should return 0 for both min and max
            expect(parsed.details.credits.min).toBe(0);
            expect(parsed.details.credits.max).toBe(0);
        }, 30000);
    });
});
