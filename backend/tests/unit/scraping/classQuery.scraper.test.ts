import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchClasses } from '../../../src/ingestion/scrapers/functions.js';
import { Term } from '../../../src/ingestion/scrapers/types/term.type.js';
import got from 'got';

vi.mock('got');

describe('searchClasses', () => {
    const mockTerm: Term = {
        id: '1040',
        title: '2025 Spring',
        sessions: []
    };

    // Mock HTML response with search results (multiple sections per class)
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
                        <div class="classHours">3</div>
                    </div>
                    <div class="classRow">
                        <div class="classSection" id="section_12346">02</div>
                        <div class="classType">Lecture</div>
                        <div class="classInstructor">Jane Smith</div>
                        <div class="classMeetingDays">TR<br></div>
                        <div class="classMeetingTimes">2:00PM - 3:15PM<br></div>
                        <div class="classHours">3</div>
                    </div>
                </div>
                <div class="classTable">
                    <div class="classAbbreviation">MATH 1301:</div>
                    <div class="classDescription">Accelerated Single-Variable Calculus II</div>
                    <div class="classRow">
                        <div class="classSection" id="section_1898">01</div>
                        <div class="classType">Lecture</div>
                        <div class="classInstructor">Dr. Smith</div>
                        <div class="classMeetingDays">MWF<br></div>
                        <div class="classMeetingTimes">9:00AM - 9:50AM<br></div>
                        <div class="classHours">4</div>
                    </div>
                </div>
            </body>
        </html>
    `;

    const mockClassDetailsHtml = `
        <div id="classSectionDetailDialog" class="dialogPanel">
           <h1>TEST-1000-01 : Test Course</h1>
           <div class="classNumber">Class Number: 12345</div>
           <div id="mainSection">
               <div class="detailHeader">Details</div>
               <div class="detailPanel">
                   <table class="nameValueTable">
                       <tr>
                           <td>
                               <table>
                                   <tr>
                                       <td class="label">School:</td>
                                       <td>College of Arts and Science</td>
                                   </tr>
                                   <tr>
                                       <td class="label">Hours:</td>
                                       <td>3.0</td>
                                   </tr>
                                   <tr>
                                       <td class="label">Grading Basis:</td>
                                       <td>Standard Grading</td>
                                   </tr>
                                   <tr>
                                       <td class="label">Component:</td>
                                       <td>Lecture</td>
                                   </tr>
                               </table>
                           </td>
                           <td>
                               <table>
                                   <tr>
                                       <td class="label">Requirement(s):</td>
                                       <td>None</td>
                                   </tr>
                               </table>
                           </td>
                       </tr>
                   </table>
               </div>
               <div class="detailHeader">Description</div>
               <div class="detailPanel">Test description</div>
           </div>
           <div id="rightSection">
               <div class="detailHeader">Attributes</div>
               <div class="detailPanel">
                   <div class="listItem">AXLE: Math and Natural Sciences</div>
               </div>
           </div>
        </div>
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

    it('should search and return classes with details', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        // Mock detail requests for each class found (2 classes)
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);

        const results = await searchClasses('CS', mockTerm);

        // Should only have 2 classes (one per .classTable), not 3 sections
        expect(results).toHaveLength(2);

        // First class should be CS 1101
        expect(results[0]).toMatchObject({
            id: '12345',
            subject: 'CS',
            abbreviation: '1101',
            name: 'Programming and Problem Solving',
            details: {
                school: 'College of Arts and Science',
                hours: '3.0',
                grading: 'Standard Grading',
                components: ['Lecture'],
                requirements: 'None',
                attributes: ['AXLE: Math and Natural Sciences'],
                description: expect.any(String)
            }
        });

        // Second class should be MATH 1301
        expect(results[1]).toMatchObject({
            id: '1898',
            subject: 'MATH',
            abbreviation: '1301',
            name: 'Accelerated Single-Variable Calculus II'
        });

        // Verify got was called correctly:
        // 1 term selection + 1 search + 2 detail requests = 4 calls
        expect(mockGot).toHaveBeenCalledTimes(4);
    });

    it('should only process first section per class', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        // Mock detail requests
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);

        const results = await searchClasses('CS', mockTerm);

        // CS 1101 has TWO sections (01 and 02), but we should only get section 01
        expect(results[0].id).toBe('12345'); // Section 01 id
        expect(results[0].id).not.toBe('12346'); // Section 02 id should not be used
    });

    it('should return empty array when no classes found', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request with no results
        mockGot.mockResolvedValueOnce({
            body: mockNoResultsHtml
        } as any);

        const results = await searchClasses('NONEXISTENT', mockTerm);

        expect(results).toHaveLength(0);
        expect(mockGot).toHaveBeenCalledTimes(2);
    });

    it('should call handler for each class with details', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        // Mock detail requests
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);

        const handler = vi.fn();
        await searchClasses('CS', mockTerm, handler);

        // Handler should be called twice (once per class with details)
        expect(handler).toHaveBeenCalledTimes(2);
        expect(handler).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                id: '12345',
                subject: 'CS',
                abbreviation: '1101',
                details: expect.objectContaining({
                    school: 'College of Arts and Science'
                })
            }),
            expect.any(Number)
        );
    });

    it('should include complete details for each class', async () => {
        const mockGot = vi.mocked(got);

        // Mock the term selection request
        mockGot.mockResolvedValueOnce({ body: '' } as any);

        // Mock the search request
        mockGot.mockResolvedValueOnce({
            body: mockSearchResultsHtml
        } as any);

        // Mock detail requests
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
        mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);

        const results = await searchClasses('CS', mockTerm);

        // Verify details structure
        results.forEach(classItem => {
            expect(classItem.details).toHaveProperty('school');
            expect(classItem.details).toHaveProperty('hours');
            expect(classItem.details).toHaveProperty('grading');
            expect(classItem.details).toHaveProperty('components');
            expect(classItem.details).toHaveProperty('requirements');
            expect(classItem.details).toHaveProperty('attributes');
            expect(classItem.details).toHaveProperty('description');
        });
    });
});
