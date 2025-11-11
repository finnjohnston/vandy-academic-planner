import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchSections } from '../../../src/scraping/scrapers/functions.js';
import { Term } from '../../../src/scraping/scrapers/types/term.type.js';
import got from 'got';

vi.mock('got');

describe('searchSections', () => {
    const mockTerm: Term = {
        id: '1040',
        title: '2025 Spring',
        sessions: []
    };

    // Mock HTML response with search results
    const mockSearchResultsHtml = `
        <html>
            <body>
                <div class="classTable">
                    <div class="classAbbreviation">CS 1101:</div>
                    <div class="classDescription">Programming and Problem Solving</div>
                    <div class="classRow">
                        <div class="classSection" id="section_12345">01</div>
                        <div class="classType">Lecture</div>
                        <div class="classInstructor">John Doe</div>
                        <div class="classMeetingDays">MWF<br></div>
                        <div class="classMeetingTimes">10:00AM - 10:50AM<br></div>
                        <div class="classHours">3.0 hrs</div>
                    </div>
                    <div class="classRow">
                        <div class="classSection" id="section_12346">02</div>
                        <div class="classType">Lecture</div>
                        <div class="classInstructor">Jane Smith</div>
                        <div class="classMeetingDays">TR<br></div>
                        <div class="classMeetingTimes">2:00PM - 3:15PM<br></div>
                        <div class="classHours">3.0 hrs</div>
                    </div>
                </div>
            </body>
        </html>
    `;

    const mockNoResultsHtml = `
        <html>
            <body>
                <div>No classes found</div>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should search and return sections for a given query', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        const results = await searchSections('CS 1101', mockTerm);

        expect(results).toHaveLength(2);

        expect(results[0]).toEqual({
            id: '12345',
            term: '1040',
            class: {
                subject: 'CS',
                abbreviation: 'CS 1101',
                name: 'Programming and Problem Solving'
            },
            number: '01',
            type: 'Lecture',
            instructors: ['John Doe'],
            schedule: 'MWF;10:00AM-10:50AM',
            hours: '3.0 hrs'
        });

        expect(results[1]).toEqual({
            id: '12346',
            term: '1040',
            class: {
                subject: 'CS',
                abbreviation: 'CS 1101',
                name: 'Programming and Problem Solving'
            },
            number: '02',
            type: 'Lecture',
            instructors: ['Jane Smith'],
            schedule: 'TR;2:00PM-3:15PM',
            hours: '3.0 hrs'
        });

        // Verify got was called correctly
        expect(mockGot).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no classes found', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request with no results
        mockGot.mockResolvedValueOnce({
            body: mockNoResultsHtml
        } as any);

        const results = await searchSections('NONEXISTENT 9999', mockTerm);

        expect(results).toHaveLength(0);
        expect(mockGot).toHaveBeenCalledTimes(2);
    });

    it('should call handler for each section found', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        const handler = vi.fn();
        await searchSections('CS 1101', mockTerm, handler);

        // Handler should be called twice (once per section)
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                id: '12345',
                number: '01'
            }),
            expect.any(Number)
        );
    });

    it('should handle sections with no instructor (staff)', async () => {
        const mockHtmlNoInstructor = `
            <html>
                <body>
                    <div class="classTable">
                        <div class="classAbbreviation">CS 2201:</div>
                        <div class="classDescription">Data Structures</div>
                        <div class="classRow">
                            <div class="classSection" id="section_11111">01</div>
                            <div class="classType">Lecture</div>
                            <div class="classInstructor"></div>
                            <div class="classMeetingDays">MWF<br></div>
                            <div class="classMeetingTimes">9:00AM - 9:50AM<br></div>
                            <div class="classHours">3.0 hrs</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockHtmlNoInstructor } as any);

        const results = await searchSections('CS 2201', mockTerm);

        expect(results).toHaveLength(1);
        expect(results[0].instructors).toEqual(['staff']);
    });
});
