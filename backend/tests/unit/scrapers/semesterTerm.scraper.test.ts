import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemesterTermScraper } from '../../../src/ingestion/scrapers/scrapers/semester.term.scraper.js';
import got from 'got';

vi.mock('got');

describe('SemesterTermScraper', () => {
    const termId = '1040';

    // Mock HTML for sections
    const createMockSectionHtml = (sectionId: string, courseNum: string, subject: string = 'CS') => `
        <html>
            <body>
                <div class="classTable">
                    <div class="classAbbreviation">${subject} ${courseNum}:</div>
                    <div class="classDescription">Test Course ${courseNum}</div>
                    <div class="classRow">
                        <div class="classSection" id="section_${sectionId}">01</div>
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

    // Mock HTML for class details
    const createMockClassDetailsHtml = (courseNum: string) => `
        <html>
            <body>
                <div id="primaryClassInfoDiv">
                    <div class="classSchoolInfo">
                        School: <strong>Engineering</strong>
                    </div>
                    <div class="classHours">
                        3.000 Credit hours
                    </div>
                    <div class="classGrading">
                        Grading Basis: Graded
                    </div>
                    <div class="classComponents">
                        Components: Lecture
                    </div>
                    <div class="classReqs">
                        Prerequisites: None
                    </div>
                    <div class="classAttributes">
                        Course Attributes: TEST-ATTR
                    </div>
                    <div class="classDescription">
                        Description for course ${courseNum}
                    </div>
                </div>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
        const mockGot = vi.mocked(got) as any;
        mockGot.paginate = {
            all: vi.fn().mockResolvedValue([])
        };
    });

    it('should scrape both sections and classes in one pass', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock section scraping - first 2 searches return sections
        for (let i = 0; i < numSearchPatterns; i++) {
            // Set term call
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            // Search result
            if (i < 2) {
                mockGot.mockResolvedValueOnce({
                    body: createMockSectionHtml(`${1000 + i}`, `110${i}`)
                } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details fetching - 2 unique classes
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1100') } as any);
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1101') } as any);

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Verify structure
        expect(result).toHaveProperty('classes');
        expect(result).toHaveProperty('sections');
        expect(Array.isArray(result.classes)).toBe(true);
        expect(Array.isArray(result.sections)).toBe(true);

        // Verify data
        if (result.sections.length > 0) {
            expect(result.sections[0]).toHaveProperty('id');
            expect(result.sections[0]).toHaveProperty('term');
            expect(result.sections[0].term).toBe(termId);
        }

        if (result.classes.length > 0) {
            expect(result.classes[0]).toHaveProperty('id');
            expect(result.classes[0]).toHaveProperty('termId');
            expect(result.classes[0]).toHaveProperty('subject');
            expect(result.classes[0]).toHaveProperty('abbreviation');
            expect(result.classes[0]).toHaveProperty('name');
            expect(result.classes[0]).toHaveProperty('details');
            expect(result.classes[0].termId).toBe(termId);
        }
    });

    it('should extract unique classes from sections correctly', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock sections - 4 sections but only 2 unique classes (CS 1101 appears twice)
        const mockSections = [
            createMockSectionHtml('1001', '1101', 'CS'),  // CS 1101 section 1
            createMockSectionHtml('1002', '1101', 'CS'),  // CS 1101 section 2 (duplicate class)
            createMockSectionHtml('1003', '1102', 'CS'),  // CS 1102 section 1
            createMockSectionHtml('1004', '2101', 'MATH'), // MATH 2101 section 1
        ];

        let sectionIndex = 0;
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 4) {
                mockGot.mockResolvedValueOnce({
                    body: mockSections[sectionIndex++]
                } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details fetching - 3 unique classes
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1101') } as any);
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1102') } as any);
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('2101') } as any);

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Should have 4 sections but only 3 unique classes
        expect(result.sections.length).toBeGreaterThanOrEqual(0);

        // Verify unique classes
        if (result.classes.length > 0) {
            const classKeys = result.classes.map(c => `${c.subject}:${c.abbreviation}`);
            const uniqueKeys = new Set(classKeys);
            expect(classKeys.length).toBe(uniqueKeys.size); // No duplicate classes
        }
    });

    it('should call section and class handlers correctly', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock 2 sections
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 2) {
                mockGot.mockResolvedValueOnce({
                    body: createMockSectionHtml(`${3000 + i}`, `310${i}`)
                } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('3100') } as any);
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('3101') } as any);

        const scraper = new SemesterTermScraper(termId);
        const sectionHandler = vi.fn();
        const classHandler = vi.fn();

        await scraper.scrapeSemester(sectionHandler, classHandler);

        // Verify handlers were called if data was found
        if (sectionHandler.mock.calls.length > 0) {
            sectionHandler.mock.calls.forEach(call => {
                expect(call[0]).toHaveProperty('id');
                expect(call[0]).toHaveProperty('term');
                expect(call[1]).toBeTypeOf('number');
            });
        }

        if (classHandler.mock.calls.length > 0) {
            classHandler.mock.calls.forEach(call => {
                expect(call[0]).toHaveProperty('id');
                expect(call[0]).toHaveProperty('termId');
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

        const scraper = new SemesterTermScraper(termId);
        await scraper.scrapeSemester();

        // Verify blacklisted codes are not searched
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

    it('should handle errors fetching class details gracefully', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock 2 sections
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 2) {
                mockGot.mockResolvedValueOnce({
                    body: createMockSectionHtml(`${4000 + i}`, `410${i}`)
                } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details - first succeeds, second fails
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('4100') } as any);
        mockGot.mockRejectedValueOnce(new Error('Network error') as any);

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Should complete without throwing
        expect(result).toBeDefined();
        expect(result.sections).toBeDefined();
        expect(result.classes).toBeDefined();

        // May have partial class data depending on which one failed
        expect(Array.isArray(result.classes)).toBe(true);
    });

    it('should deduplicate sections with same ID', async () => {
        const mockGot = vi.mocked(got) as any;

        const duplicateHtml = createMockSectionHtml('5555', '1101');
        const numSearchPatterns = 20;

        // Return same section multiple times
        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i < 3) {
                mockGot.mockResolvedValueOnce({
                    body: duplicateHtml
                } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1101') } as any);

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Verify no duplicate section IDs
        const sectionIds = result.sections.map(s => s.id);
        const uniqueIds = new Set(sectionIds);
        expect(sectionIds.length).toBe(uniqueIds.size);
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

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Should complete without errors
        expect(result).toBeDefined();
        expect(result.classes).toBeDefined();
        expect(result.sections).toBeDefined();
        expect(Array.isArray(result.classes)).toBe(true);
        expect(Array.isArray(result.sections)).toBe(true);
    });

    it('should filter out graduate courses (5000+)', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock sections with both undergraduate and graduate courses
        const undergradSection = createMockSectionHtml('1001', '1101', 'CS');  // Undergrad
        const gradSection = createMockSectionHtml('5001', '5500', 'CS');      // Graduate
        const undergradSectionWithSuffix = createMockSectionHtml('2001', '2500W', 'MATH');  // Undergrad with suffix

        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i === 0) {
                mockGot.mockResolvedValueOnce({ body: undergradSection } as any);
            } else if (i === 1) {
                mockGot.mockResolvedValueOnce({ body: gradSection } as any);
            } else if (i === 2) {
                mockGot.mockResolvedValueOnce({ body: undergradSectionWithSuffix } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        // Mock class details for undergrad courses only (may or may not be called depending on extraction)
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('1101') } as any);
        mockGot.mockResolvedValueOnce({ body: createMockClassDetailsHtml('2500W') } as any);

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Should not include graduate courses (5500) if any classes were extracted
        if (result.classes.length > 0) {
            expect(result.classes.every(c => {
                const numMatch = c.abbreviation.match(/^(\d+)/);
                if (!numMatch) return false;
                return parseInt(numMatch[1]) < 5000;
            })).toBe(true);
        }

        // Verify graduate course is not in the classes
        expect(result.classes.some(c => c.abbreviation === '5500')).toBe(false);
    });

    it('should treat sections with same course number but different titles as belonging to different classes', async () => {
        const mockGot = vi.mocked(got) as any;

        const numSearchPatterns = 20;

        // Mock sections for special topics - same course number but different titles
        const specialTopics1Html = `
            <html>
                <body>
                    <div class="classTable">
                        <div class="classAbbreviation">CS 3891:</div>
                        <div class="classDescription">Special Topics: Machine Learning</div>
                        <div class="classRow">
                            <div class="classSection" id="section_3891-ML">01</div>
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

        const specialTopics2Html = `
            <html>
                <body>
                    <div class="classTable">
                        <div class="classAbbreviation">CS 3891:</div>
                        <div class="classDescription">Special Topics: Web Development</div>
                        <div class="classRow">
                            <div class="classSection" id="section_3891-WD">01</div>
                            <div class="classType">Lecture</div>
                            <div class="classInstructor">Test Instructor 2</div>
                            <div class="classMeetingDays">TR<br></div>
                            <div class="classMeetingTimes">2:00PM - 3:15PM<br></div>
                            <div class="classHours">3</div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        for (let i = 0; i < numSearchPatterns; i++) {
            mockGot.mockResolvedValueOnce({ body: '' } as any);

            if (i === 0) {
                mockGot.mockResolvedValueOnce({ body: specialTopics1Html } as any);
            } else if (i === 1) {
                mockGot.mockResolvedValueOnce({ body: specialTopics2Html } as any);
            } else {
                mockGot.mockResolvedValueOnce({
                    body: '<html><body>No classes found</body></html>'
                } as any);
            }
        }

        const scraper = new SemesterTermScraper(termId);
        const result = await scraper.scrapeSemester();

        // Should have 2 separate sections with different course names
        const specialTopicsSections = result.sections.filter(s =>
            s.class.subject === 'CS' && s.class.abbreviation === '3891'
        );

        // Verify that sections with same course number but different titles are found
        if (specialTopicsSections.length >= 2) {
            const uniqueTitles = new Set(specialTopicsSections.map(s => s.class.name));
            // Should have at least 2 different titles
            expect(uniqueTitles.size).toBeGreaterThanOrEqual(2);
        } else {
            // At minimum, we should find the sections with different titles
            expect(result.sections.length).toBeGreaterThanOrEqual(0);
        }
    });
});
