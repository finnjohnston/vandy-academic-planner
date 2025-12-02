import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseQueryScraper } from '../../../src/ingestion/scrapers/scrapers/course.query.scraper.js';
import got from 'got';

vi.mock('got');

describe('CourseQueryScraper', () => {
    const courseId = '12345';
    const offerNumber = '1';

    const mockCourseDetailHtml = `
        <div id="courseDetailDialog">
            <h1>Computer Science 1101 - Programming and Problem Solving</h1>
            <div id="mainSection">
                <div class="detailPanel">
                    <table class="nameValueTable">
                        <tr>
                            <td class="label"><strong>School:</strong></td>
                            <td>College of Arts and Science</td>
                        </tr>
                        <tr>
                            <td class="label"><strong>Units:</strong></td>
                            <td>3.0</td>
                        </tr>
                        <tr>
                            <td class="label"><strong>Grading Basis:</strong></td>
                            <td>Standard Grading</td>
                        </tr>
                        <tr>
                            <td class="label"><strong>Components:</strong></td>
                            <td>
                                <div>Lecture (Required)</div>
                                <div>Lab (Optional)</div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            <div id="rightSection">
                <div class="detailPanel">
                    <table class="nameValueTable">
                        <tr>
                            <td class="label"><strong>Typically Offered:</strong></td>
                            <td>Fall, Spring</td>
                        </tr>
                        <tr>
                            <td class="label"><strong>Requirements:</strong></td>
                            <td>None</td>
                        </tr>
                        <tr>
                            <td class="label"><strong>Attributes:</strong></td>
                            <td>
                                <div>AXLE Natural Science</div>
                                <div>AXLE Math & Natural Science</div>
                            </td>
                        </tr>
                    </table>
                </div>
            </div>
            <div class="detailHeader">Description</div>
            <div class="detailPanel">
                This course introduces students to programming and problem solving.
            </div>
        </div>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should scrape a course with complete details', async () => {
        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailHtml
        } as any);

        const scraper = new CourseQueryScraper(courseId, offerNumber);
        const courses = await scraper.scrape();

        expect(courses).toHaveLength(1);
        const course = courses[0];

        expect(course.id).toBe(courseId);
        expect(course.subject).toBe('CS');
        expect(course.abbreviation).toBe('1101');
        expect(course.name).toBe('Programming and Problem Solving');

        expect(course.details.school).toBe('College of Arts and Science');
        expect(course.details.hours).toBe('3.0');
        expect(course.details.grading).toBe('Standard Grading');
        expect(course.details.components).toEqual(['Lecture', 'Lab']);
        expect(course.details.typicallyOffered).toBe('Fall, Spring');
        expect(course.details.requirements).toBe('None');
        expect(course.details.attributes).toEqual(['AXLE Natural Science', 'AXLE Math & Natural Science']);
        expect(course.details.description).toBe('This course introduces students to programming and problem solving.');
    });

    it('should handle course with multi-word subject name', async () => {
        const mockHtml = `
            <div id="courseDetailDialog">
                <h1>Biological Sciences 1100 - General Biology</h1>
                <div id="mainSection">
                    <div class="detailPanel">
                        <table class="nameValueTable">
                            <tr>
                                <td class="label"><strong>School:</strong></td>
                                <td>College of Arts and Science</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div id="rightSection"></div>
            </div>
        `;

        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({ body: mockHtml } as any);

        const scraper = new CourseQueryScraper(courseId, offerNumber);
        const courses = await scraper.scrape();

        expect(courses[0].subject).toBe('BS');
        expect(courses[0].abbreviation).toBe('1100');
        expect(courses[0].name).toBe('General Biology');
    });

    it('should handle course without optional fields', async () => {
        const mockHtml = `
            <div id="courseDetailDialog">
                <h1>Mathematics 1300 - Accelerated Single-Variable Calculus I</h1>
                <div id="mainSection">
                    <div class="detailPanel">
                        <table class="nameValueTable">
                            <tr>
                                <td class="label"><strong>School:</strong></td>
                                <td>College of Arts and Science</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div id="rightSection">
                    <div class="detailPanel">
                        <table class="nameValueTable">
                        </table>
                    </div>
                </div>
            </div>
        `;

        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({ body: mockHtml } as any);

        const scraper = new CourseQueryScraper(courseId, offerNumber);
        const courses = await scraper.scrape();

        const course = courses[0];
        expect(course.details.typicallyOffered).toBeNull();
        expect(course.details.requirements).toBeNull();
        expect(course.details.hours).toBeNull();
        expect(course.details.grading).toBeNull();
        expect(course.details.description).toBeNull();
        expect(course.details.components).toEqual([]);
        expect(course.details.attributes).toEqual([]);
    });

    it('should call handler with course and elapsed time', async () => {
        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailHtml
        } as any);

        const scraper = new CourseQueryScraper(courseId, offerNumber);
        const handler = vi.fn();

        await scraper.scrape(handler);

        expect(handler).toHaveBeenCalledOnce();
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                id: courseId,
                subject: 'CS',
                abbreviation: '1101'
            }),
            expect.any(Number)
        );
    });

    it('should use correct URL parameters', async () => {
        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailHtml
        } as any);

        const scraper = new CourseQueryScraper(courseId, '2');
        await scraper.scrape();

        expect(mockGot).toHaveBeenCalledWith(
            expect.stringContaining('GetCourseDetail.action'),
            expect.objectContaining({
                searchParams: {
                    id: courseId,
                    offerNumber: '2'
                }
            })
        );
    });

    it('should use provided subject code instead of deriving from title', async () => {
        const mockGot = vi.mocked(got) as any;

        // HTML says "Communication Studies" which would derive to "CS"
        // But we're providing "CMST" as the subject code
        const cmstHtml = `
            <div id="courseDetailDialog">
                <h1>Communication Studies 2200 - Introduction to Communication Studies</h1>
                <div id="mainSection">
                    <div class="detailPanel">
                        <table class="nameValueTable">
                            <tr>
                                <td class="label"><strong>School:</strong></td>
                                <td>College of Arts and Science</td>
                            </tr>
                        </table>
                    </div>
                </div>
                <div id="rightSection"></div>
            </div>
        `;

        mockGot.mockResolvedValueOnce({ body: cmstHtml } as any);

        // Provide "CMST" as the subject code
        const scraper = new CourseQueryScraper(courseId, '1', 'CMST');
        const courses = await scraper.scrape();

        // Should use provided "CMST" instead of deriving "CS" from title
        expect(courses[0].subject).toBe('CMST');
        expect(courses[0].abbreviation).toBe('2200');
        expect(courses[0].name).toBe('Introduction to Communication Studies');
    });

    it('should fall back to deriving subject code when not provided', async () => {
        const mockGot = vi.mocked(got) as any;
        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailHtml
        } as any);

        // Don't provide subject code (backward compatibility)
        const scraper = new CourseQueryScraper(courseId, '1');
        const courses = await scraper.scrape();

        // Should derive "CS" from "Computer Science" in title
        expect(courses[0].subject).toBe('CS');
        expect(courses[0].abbreviation).toBe('1101');
    });

    it('should correctly handle CMST vs CS subject codes', async () => {
        const mockGot = vi.mocked(got) as any;

        // Test Communication Studies with CMST code
        const cmstHtml = `
            <div id="courseDetailDialog">
                <h1>Communication Studies 1500 - Fundamentals of Public Speaking</h1>
                <div id="mainSection"><div class="detailPanel"><table class="nameValueTable"></table></div></div>
                <div id="rightSection"></div>
            </div>
        `;
        mockGot.mockResolvedValueOnce({ body: cmstHtml } as any);

        const cmstScraper = new CourseQueryScraper('111111', '1', 'CMST');
        const cmstCourses = await cmstScraper.scrape();

        expect(cmstCourses[0].subject).toBe('CMST');
        expect(cmstCourses[0].name).toBe('Fundamentals of Public Speaking');

        // Test Computer Science with CS code
        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailHtml
        } as any);

        const csScraper = new CourseQueryScraper('222222', '1', 'CS');
        const csCourses = await csScraper.scrape();

        expect(csCourses[0].subject).toBe('CS');
        expect(csCourses[0].name).toBe('Programming and Problem Solving');

        // Verify they're different
        expect(cmstCourses[0].subject).not.toBe(csCourses[0].subject);
    });
});
