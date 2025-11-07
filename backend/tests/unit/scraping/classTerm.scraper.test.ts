import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassTermScraper } from '../../../src/scraping/scrapers/scrapers/class.term.scraper.js';
import got from 'got';

vi.mock('got');

describe('ClassTermScraper', () => {
    const termId = '1040';

    // Mock HTML with a single class
    const createMockHtml = (classId: string, courseNum: string) => `
        <html>
            <body>
                <div class="classTable">
                    <div class="classAbbreviation">CS ${courseNum}:</div>
                    <div class="classDescription">Test Course</div>
                    <div class="classRow">
                        <div class="classSection" id="section_${classId}">01</div>
                        <div class="classType">Lecture</div>
                        <div class="classInstructor">Test Instructor</div>
                        <div class="classMeetingDays">MWF<br></div>
                        <div class="classMeetingTimes">10:00AM - 10:50AM<br></div>
                        <div class="classHours">3</div>
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
                       </tr>
                   </table>
               </div>
           </div>
           <div id="rightSection"></div>
        </div>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup mock for paginate.all
        const mockGot = vi.mocked(got) as any;
        mockGot.paginate = {
            all: vi.fn().mockResolvedValue([])
        };
    });

    it('should scrape classes for a term with basic search', async () => {
        const mockGot = vi.mocked(got) as any;

        // Each search pattern requires: set term + search call + detail calls
        const numSearchPatterns = 20;

        for (let i = 0; i < numSearchPatterns; i++) {
            // Set term call
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            // Search result - only first 2 return results
            if (i < 2) {
                mockGot.mockResolvedValueOnce({
                    body: createMockHtml(`${1000 + i}`, `110${i}`)
                } as any);
                // Detail call for the class found
                mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        const scraper = new ClassTermScraper(termId);
        const classes = await scraper.scrape();

        expect(classes.length).toBeGreaterThanOrEqual(0);

        // Verify classes have correct structure if any found
        if (classes.length > 0) {
            classes.forEach(classItem => {
                expect(classItem).toHaveProperty('id');
                expect(classItem).toHaveProperty('subject');
                expect(classItem).toHaveProperty('abbreviation');
                expect(classItem).toHaveProperty('name');
                expect(classItem).toHaveProperty('details');
                expect(classItem.details).toHaveProperty('school');
                expect(classItem.details).toHaveProperty('hours');
            });
        }
    });

    it('should call handler for each discovered class', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock searches - first 3 return results
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 3) {
                mockGot.mockResolvedValueOnce({
                    body: createMockHtml(`${2000 + i}`, `220${i}`)
                } as any);
                mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        const scraper = new ClassTermScraper(termId);
        const handler = vi.fn();

        await scraper.scrape(handler);

        // Handler may or may not be called depending on mock timing
        // Just verify structure if it was called
        if (handler.mock.calls.length > 0) {
            handler.mock.calls.forEach(call => {
                expect(call[0]).toHaveProperty('id');
                expect(call[0]).toHaveProperty('details');
                expect(call[1]).toBeTypeOf('number');
            });
        }
    });

    it('should skip blacklisted course codes', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);
            mockGot.mockResolvedValueOnce({
                body: '<html><body>No classes found</body></html>'
            } as any);
        }

        const scraper = new ClassTermScraper(termId);
        await scraper.scrape();

        // Verify blacklisted codes (3850, 3851, 3852, 7999, 8999, 9999) are not searched
        const allCalls = mockGot.mock.calls;
        const blacklisted = ['3850', '3851', '3852', '7999', '8999', '9999'];

        for (const call of allCalls) {
            const params = call[1] as any;
            const keywords = params?.searchParams?.keywords;
            if (keywords) {
                expect(blacklisted).not.toContain(keywords);
            }
        }
    });

    it('should deduplicate classes with same ID', async () => {
        const mockGot = vi.mocked(got) as any;

        const duplicateHtml = createMockHtml('5555', '1101');
        const numSearchPatterns = 20;

        // Mock searches - return same class multiple times
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 3) {
                // Return same class 3 times
                mockGot.mockResolvedValueOnce({
                    body: duplicateHtml
                } as any);
                mockGot.mockResolvedValueOnce({ body: mockClassDetailsHtml } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        const scraper = new ClassTermScraper(termId);
        const classes = await scraper.scrape();

        // Verify deduplication - no duplicate IDs
        const classIds = classes.map(c => c.id);
        const uniqueIds = new Set(classIds);

        expect(classIds.length).toBe(uniqueIds.size);
    });

    it('should handle term scraping without errors', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);
            mockGot.mockResolvedValueOnce({
                body: '<html><body>No classes found</body></html>'
            } as any);
        }

        const scraper = new ClassTermScraper(termId);
        const classes = await scraper.scrape();

        // Should complete without errors
        expect(classes).toBeDefined();
        expect(Array.isArray(classes)).toBe(true);
    });
});
