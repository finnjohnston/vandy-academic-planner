import { describe, it, expect } from 'vitest';
import { parseSchedule } from '../../../src/scraping/parsers/parsers/core/schedule.parser.js';

describe('parseSchedule', () => {

    it('should parse MWF morning schedule', () => {
        const parsed = parseSchedule('MWF 10:00AM - 10:50AM');

        expect(parsed.days).toEqual(['M', 'W', 'F']);
        expect(parsed.startTime).toBe('10:00');
        expect(parsed.endTime).toBe('10:50');
        expect(parsed.raw).toBe('MWF 10:00AM - 10:50AM');
    });

    it('should parse TR afternoon schedule', () => {
        const parsed = parseSchedule('TR 2:00PM - 3:15PM');

        expect(parsed.days).toEqual(['T', 'R']);
        expect(parsed.startTime).toBe('14:00');
        expect(parsed.endTime).toBe('15:15');
    });

    it('should handle 12:00PM correctly (noon)', () => {
        const parsed = parseSchedule('MW 12:00PM - 1:15PM');

        expect(parsed.startTime).toBe('12:00');
        expect(parsed.endTime).toBe('13:15');
    });

    it('should handle 12:00AM correctly (midnight)', () => {
        const parsed = parseSchedule('MW 12:00AM - 1:00AM');

        expect(parsed.startTime).toBe('00:00');
        expect(parsed.endTime).toBe('01:00');
    });

    it('should parse schedule with <br> tags', () => {
        const parsed = parseSchedule('MWF 10:00AM - 10:50AM<br>');

        expect(parsed.days).toEqual(['M', 'W', 'F']);
    });

    it('should return empty schedule for empty string', () => {
        const parsed = parseSchedule('');

        expect(parsed.days).toEqual([]);
        expect(parsed.startTime).toBe('');
        expect(parsed.endTime).toBe('');
        expect(parsed.raw).toBe('');
    });

    it('should return empty schedule for TBA', () => {
        const parsed = parseSchedule('TBA');

        expect(parsed.days).toEqual([]);
        expect(parsed.startTime).toBe('');
        expect(parsed.endTime).toBe('');
        expect(parsed.raw).toBe('TBA');
    });

    it('should handle all day codes (M, T, W, R, F)', () => {
        const parsed = parseSchedule('MTWRF 10:00AM - 10:50AM');

        expect(parsed.days).toEqual(['M', 'T', 'W', 'R', 'F']);
    });

    it('should handle single day', () => {
        const parsed = parseSchedule('M 10:00AM - 10:50AM');

        expect(parsed.days).toEqual(['M']);
        expect(parsed.startTime).toBe('10:00');
        expect(parsed.endTime).toBe('10:50');
    });

    it('should preserve raw schedule string', () => {
        const rawSchedule = 'MWF 8:30AM - 9:45AM';
        const parsed = parseSchedule(rawSchedule);

        expect(parsed.raw).toBe(rawSchedule);
    });

    it('should return empty schedule for invalid format', () => {
        const parsed = parseSchedule('Monday at 10am');

        expect(parsed.days).toEqual([]);
        expect(parsed.startTime).toBe('');
        expect(parsed.endTime).toBe('');
        expect(parsed.raw).toBe('Monday at 10am');
    });

    it('should handle whitespace variations', () => {
        const parsed = parseSchedule('MWF  10:00AM  -  10:50AM');

        expect(parsed.days).toEqual(['M', 'W', 'F']);
    });

    it('should handle case insensitive time markers', () => {
        const parsed = parseSchedule('MWF 10:00am - 10:50pm');

        expect(parsed.startTime).toBe('10:00');
        expect(parsed.endTime).toBe('22:50');
    });

    it('should handle duplicate day codes', () => {
        const parsed = parseSchedule('MMW 10:00AM - 10:50AM');

        expect(parsed.days).toEqual(['M', 'W']);
    });
});
