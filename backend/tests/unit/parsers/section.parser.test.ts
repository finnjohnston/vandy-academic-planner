import { describe, it, expect } from 'vitest';
import { parseSection, ParsedSection } from '../../../src/ingestion/parsers/index.js';
import { Section } from '../../../src/ingestion/scrapers/types/section.type.js';

describe('parseSection', () => {

    describe('Complete section parsing', () => {
        it('should parse a section with single credit value and regular schedule', () => {
            const section: Section = {
                id: '12345',
                term: '1040',
                class: {
                    subject: 'CS',
                    abbreviation: '1101',
                    name: 'Programming and Problem Solving'
                },
                number: '01',
                instructors: ['John Doe'],
                type: 'Lecture',
                schedule: 'MWF 10:00AM - 10:50AM',
                hours: '3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.id).toBe('12345');
            expect(parsed.term).toBe('1040');
            expect(parsed.class).toEqual({
                subject: 'CS',
                abbreviation: '1101',
                name: 'Programming and Problem Solving'
            });
            expect(parsed.number).toBe('01');
            expect(parsed.instructors).toEqual(['John Doe']);
            expect(parsed.type).toBe('Lecture');

            // Check parsed schedule
            expect(parsed.schedule.days).toEqual(['M', 'W', 'F']);
            expect(parsed.schedule.startTime).toBe('10:00');
            expect(parsed.schedule.endTime).toBe('10:50');
            expect(parsed.schedule.raw).toBe('MWF 10:00AM - 10:50AM');

            // Check parsed credits
            expect(parsed.credits.min).toBe(3.0);
            expect(parsed.credits.max).toBe(3.0);
        });

        it('should parse a section with credit range', () => {
            const section: Section = {
                id: '67890',
                term: '1040',
                class: {
                    subject: 'MUSL',
                    abbreviation: '1220',
                    name: 'Private Instruction'
                },
                number: '03',
                instructors: ['Jane Smith', 'Bob Johnson'],
                type: 'Private Instruction',
                schedule: 'TR 2:00PM - 3:15PM',
                hours: '1.0-3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.id).toBe('67890');
            expect(parsed.instructors).toEqual(['Jane Smith', 'Bob Johnson']);

            // Check parsed schedule
            expect(parsed.schedule.days).toEqual(['T', 'R']);
            expect(parsed.schedule.startTime).toBe('14:00');
            expect(parsed.schedule.endTime).toBe('15:15');

            // Check parsed credits range
            expect(parsed.credits.min).toBe(1.0);
            expect(parsed.credits.max).toBe(3.0);
        });

        it('should parse a section with PM afternoon time', () => {
            const section: Section = {
                id: '11111',
                term: '1040',
                class: {
                    subject: 'MATH',
                    abbreviation: '2300',
                    name: 'Multivariable Calculus'
                },
                number: '02',
                instructors: ['Dr. Smith'],
                type: 'Lecture',
                schedule: 'MWF 1:00PM - 1:50PM',
                hours: '4.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.schedule.startTime).toBe('13:00');
            expect(parsed.schedule.endTime).toBe('13:50');
            expect(parsed.credits.min).toBe(4.0);
            expect(parsed.credits.max).toBe(4.0);
        });

        it('should parse a section with early morning time', () => {
            const section: Section = {
                id: '22222',
                term: '1040',
                class: {
                    subject: 'ECON',
                    abbreviation: '1010',
                    name: 'Principles of Microeconomics'
                },
                number: '01',
                instructors: ['Prof. Brown'],
                type: 'Lecture',
                schedule: 'TR 8:00AM - 9:15AM',
                hours: '3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.schedule.startTime).toBe('08:00');
            expect(parsed.schedule.endTime).toBe('09:15');
        });
    });

    describe('Edge cases', () => {
        it('should handle empty instructors array', () => {
            const section: Section = {
                id: '33333',
                term: '1040',
                class: {
                    subject: 'PHYS',
                    abbreviation: '1601',
                    name: 'Introductory Physics I'
                },
                number: '05',
                instructors: [],
                type: 'Lecture',
                schedule: 'MWF 9:00AM - 9:50AM',
                hours: '4.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.instructors).toEqual([]);
        });

        it('should handle staff as instructor', () => {
            const section: Section = {
                id: '44444',
                term: '1040',
                class: {
                    subject: 'CS',
                    abbreviation: '3251',
                    name: 'Intermediate Software Design'
                },
                number: '02',
                instructors: ['staff'],
                type: 'Lecture',
                schedule: 'TR 11:00AM - 12:15PM',
                hours: '3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.instructors).toEqual(['staff']);
        });

        it('should handle schedule with <br> tags', () => {
            const section: Section = {
                id: '55555',
                term: '1040',
                class: {
                    subject: 'BSCI',
                    abbreviation: '1100',
                    name: 'General Biology'
                },
                number: '01',
                instructors: ['Dr. Green'],
                type: 'Lecture',
                schedule: 'MWF<br>10:00AM - 10:50AM',
                hours: '4.0 hrs'
            };

            const parsed = parseSection(section);

            // Should still parse correctly after removing <br>
            expect(parsed.schedule.days).toEqual(['M', 'W', 'F']);
            expect(parsed.schedule.startTime).toBe('10:00');
        });

        it('should handle invalid schedule gracefully', () => {
            const section: Section = {
                id: '66666',
                term: '1040',
                class: {
                    subject: 'ART',
                    abbreviation: '1000',
                    name: 'Introduction to Art'
                },
                number: '01',
                instructors: ['Prof. Artist'],
                type: 'Studio',
                schedule: 'By Arrangement',
                hours: '3.0 hrs'
            };

            const parsed = parseSection(section);

            // Invalid schedule should return empty values
            expect(parsed.schedule.days).toEqual([]);
            expect(parsed.schedule.startTime).toBe('');
            expect(parsed.schedule.endTime).toBe('');
            expect(parsed.schedule.raw).toBe('By Arrangement');

            // Credits should still parse
            expect(parsed.credits.min).toBe(3.0);
            expect(parsed.credits.max).toBe(3.0);
        });

        it('should handle empty hours string', () => {
            const section: Section = {
                id: '77777',
                term: '1040',
                class: {
                    subject: 'MUS',
                    abbreviation: '1000',
                    name: 'Music Ensemble'
                },
                number: '01',
                instructors: ['Dr. Music'],
                type: 'Ensemble',
                schedule: 'TR 3:00PM - 4:15PM',
                hours: ''
            };

            const parsed = parseSection(section);

            // Empty hours should return 0 for both min and max
            expect(parsed.credits.min).toBe(0);
            expect(parsed.credits.max).toBe(0);
        });
    });

    describe('Real-world examples', () => {
        it('should parse typical CS lecture section', () => {
            const section: Section = {
                id: '88888',
                term: '1040',
                class: {
                    subject: 'CS',
                    abbreviation: '2201',
                    name: 'Data Structures'
                },
                number: '01',
                instructors: ['Dr. Computer'],
                type: 'Lecture',
                schedule: 'MWF 11:00AM - 11:50AM',
                hours: '3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed).toMatchObject({
                id: '88888',
                term: '1040',
                class: {
                    subject: 'CS',
                    abbreviation: '2201',
                    name: 'Data Structures'
                },
                number: '01',
                instructors: ['Dr. Computer'],
                type: 'Lecture'
            });

            expect(parsed.schedule).toEqual({
                days: ['M', 'W', 'F'],
                startTime: '11:00',
                endTime: '11:50',
                raw: 'MWF 11:00AM - 11:50AM'
            });

            expect(parsed.credits).toEqual({
                min: 3.0,
                max: 3.0
            });
        });

        it('should parse variable credit independent study', () => {
            const section: Section = {
                id: '99999',
                term: '1040',
                class: {
                    subject: 'CS',
                    abbreviation: '3860',
                    name: 'Independent Study'
                },
                number: '01',
                instructors: ['Various Faculty'],
                type: 'Independent Study',
                schedule: 'By Arrangement',
                hours: '1.0-3.0 hrs'
            };

            const parsed = parseSection(section);

            expect(parsed.credits).toEqual({
                min: 1.0,
                max: 3.0
            });

            expect(parsed.schedule.days).toEqual([]);
        });
    });
});
