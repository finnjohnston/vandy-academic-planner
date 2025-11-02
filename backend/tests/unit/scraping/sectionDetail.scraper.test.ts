import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSectionDetails } from '../../../src/scraping/scrapers/functions.js';
import { Section } from '../../../src/scraping/scrapers/types/section.type.js';
import got from 'got';

vi.mock('got');

describe('getSectionDetails', () => {
    const mockSection: Section = {
        id: '12345',
        term: '1040',
        course: {
            subject: 'CS',
            abbreviation: 'CS 1101',
            name: 'Programming and Problem Solving'
        },
        number: '01',
        type: 'Lecture',
        instructors: ['John Doe'],
        schedule: 'MWF;10:00AM-10:50AM',
        hours: 3
    };

    const mockDetailsHtml = `
        <html>
            <body>
                <div id="mainSection">
                    <div class="detailHeader">Description</div>
                    <div>Introduction to programming concepts and problem-solving techniques.</div>

                    <div class="detailHeader">Notes</div>
                    <div>Prerequisites: None</div>

                    <div class="detailHeader">Details</div>
                    <table>
                        <tr>
                            <td class="label">School:</td>
                            <td>School of Engineering</td>
                        </tr>
                        <tr>
                            <td class="label">Requirement(s):</td>
                            <td>AXLE Mathematics and Natural Sciences</td>
                        </tr>
                    </table>
                </div>
                <div id="rightSection">
                    <div class="detailHeader">Attributes</div>
                    <div class="detailsPanel">
                        <div class="listItem">Counts towards Computer Science major</div>
                        <div class="listItem">AXLE Mathematics</div>
                    </div>

                    <div class="detailHeader">Availability</div>
                    <div class="detailsPanel">
                        <table class="availabilityNameValueTable">
                            <tr>
                                <td class="label">Class Capacity:</td>
                                <td>40</td>
                            </tr>
                            <tr>
                                <td class="label">Total Enrolled:</td>
                                <td>35</td>
                            </tr>
                            <tr>
                                <td class="label">Wait List Capacity:</td>
                                <td>10</td>
                            </tr>
                            <tr>
                                <td class="label">Total on Wait List:</td>
                                <td>0</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <script>
                    openWindow('https://bookstore.vanderbilt.edu/book/12345', 'BookLook');
                </script>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and parse section details', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockDetailsHtml
        } as any);

        const details = await getSectionDetails(mockSection);

        expect(details).toEqual({
            school: 'School of Engineering',
            description: 'Introduction to programming concepts and problem-solving techniques.',
            notes: 'Prerequisites: None',
            attributes: ['Counts towards Computer Science major', 'AXLE Mathematics'],
            availability: {
                seats: 40,
                enrolled: 35,
                waitlistSeats: 10,
                waitlistEnrolled: 0
            },
            requirements: 'AXLE Mathematics and Natural Sciences',
            bookURL: 'https://bookstore.vanderbilt.edu/book/12345'
        });

        // Verify got was called with correct parameters
        expect(mockGot).toHaveBeenCalledWith(
            expect.stringContaining('GetClassSectionDetail.action'),
            expect.objectContaining({
                searchParams: {
                    classNumber: '12345',
                    termCode: '1040'
                }
            })
        );
    });

    it('should call handler with section details', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockDetailsHtml
        } as any);

        const handler = vi.fn();
        await getSectionDetails(mockSection, handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                school: 'School of Engineering',
                description: expect.any(String)
            }),
            expect.any(Number)
        );
    });

    it('should handle sections with missing details', async () => {
        const minimalHtml = `
            <html>
                <body>
                    <div id="mainSection"></div>
                    <div id="rightSection"></div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);
        mockGot.mockResolvedValueOnce({ body: minimalHtml } as any);

        const details = await getSectionDetails(mockSection);

        expect(details).toEqual({
            school: null,
            description: null,
            notes: null,
            attributes: [],
            availability: null,
            requirements: null,
            bookURL: null
        });
    });

    it('should work without a handler', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockDetailsHtml
        } as any);

        const details = await getSectionDetails(mockSection);

        expect(details).toBeDefined();
        expect(details.school).toBe('School of Engineering');
    });
});
