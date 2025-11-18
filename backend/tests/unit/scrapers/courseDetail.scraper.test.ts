import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCourseDetails } from '../../../src/ingestion/scrapers/functions.js';
import got from 'got';

vi.mock('got');

describe('getCourseDetails', () => {
    // Mock HTML based on actual Vanderbilt course catalog response
    const mockCourseDetailsHtml = `
        <html>
            <body>
                <div id="courseDetailDialog" class="dialogPanel">
                    <h1>Mathematics 1301 - Accelerated Single-Variable Calculus II</h1>

                    <div id="mainSection">
                        <div class="detailHeader">Details</div>
                        <div class="detailPanel">
                            <table class="nameValueTable">
                                <tr>
                                    <td class="label"><strong>Career:</strong></td>
                                    <td>Undergraduate</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>School:</strong></td>
                                    <td>College of Arts and Science</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>Units:</strong></td>
                                    <td>4.0</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>Grading Basis:</strong></td>
                                    <td>Student Option Grading Basis</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>Components:</strong></td>
                                    <td>
                                        <div>Lecture&nbsp;(Required)</div>
                                        <div>Discussion&nbsp;(Required)</div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div id="rightSection">
                        <div class="detailHeader">Enrollment Information</div>
                        <div class="detailPanel">
                            <table class="nameValueTable">
                                <tr>
                                    <td class="label"><strong>Typically Offered:</strong></td>
                                    <td>Fall, Spring, Summer</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>Requirement:</strong></td>
                                    <td>MATH 1300 or 1201 is a prerequisite to this course. Not open to students who have earned credit for MATH 1201 without permission.</td>
                                </tr>
                                <tr>
                                    <td class="label"><strong>Attributes:</strong></td>
                                    <td>
                                        <div>CORE: B-Systemic &amp; Structural Reasoning</div>
                                        <div>LE: MNS-Math and Natural Sciences</div>
                                        <div>AXLE: Math and Natural Sciences</div>
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <div class="clear"></div>

                    <div class="detailHeader">Description</div>
                    <div class="detailPanel">
                        Differentiation and integration of transcendental functions, applications, methods of integration, coordinate geometry, polar coordinates, infinite series. Not open to students who have earned credit for MATH 1201 without permission. Total credit for this course and MATH 1201 will not exceed 6 credit hours. Credit hours reduced from second course taken (or from test or transfer credit) as appropriate. Prerequisite: 1300 or 1201. [4] (MNS) (CORE B) (LE MNS)
                    </div>
                </div>
            </body>
        </html>
    `;

    const mockMinimalHtml = `
        <html>
            <body>
                <div id="courseDetailDialog" class="dialogPanel">
                    <h1>Test Course 1000 - Test Course Name</h1>
                    <div id="mainSection">
                        <div class="detailPanel">
                            <table class="nameValueTable"></table>
                        </div>
                    </div>
                    <div id="rightSection">
                        <div class="detailPanel">
                            <table class="nameValueTable"></table>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and parse complete course details', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770', '1');

        expect(details).toEqual({
            school: 'College of Arts and Science',
            hours: '4.0',
            grading: 'Student Option Grading Basis',
            components: ['Lecture', 'Discussion'],
            typicallyOffered: 'Fall, Spring, Summer',
            requirements: 'MATH 1300 or 1201 is a prerequisite to this course. Not open to students who have earned credit for MATH 1201 without permission.',
            attributes: [
                'CORE: B-Systemic & Structural Reasoning',
                'LE: MNS-Math and Natural Sciences',
                'AXLE: Math and Natural Sciences'
            ],
            description: expect.stringContaining('Differentiation and integration of transcendental functions')
        });

        // Verify got was called with correct parameters
        expect(mockGot).toHaveBeenCalledWith(
            expect.stringContaining('GetCourseDetail.action'),
            expect.objectContaining({
                searchParams: {
                    id: '101770',
                    offerNumber: '1'
                }
            })
        );
    });

    it('should parse units/hours correctly', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770');

        expect(details.hours).toBe('4.0');
        expect(typeof details.hours).toBe('string');
    });

    it('should extract multiple components correctly', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770');

        expect(details.components).toEqual(['Lecture', 'Discussion']);
        expect(details.components).toHaveLength(2);
    });

    it('should extract multiple attributes correctly', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770');

        expect(details.attributes).toHaveLength(3);
        expect(details.attributes).toContain('CORE: B-Systemic & Structural Reasoning');
        expect(details.attributes).toContain('LE: MNS-Math and Natural Sciences');
        expect(details.attributes).toContain('AXLE: Math and Natural Sciences');
    });

    it('should handle HTML entities in attributes', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770');

        // The &amp; should be decoded to &
        expect(details.attributes[0]).toContain('&');
        expect(details.attributes[0]).not.toContain('&amp;');
    });

    it('should call handler with course details and timestamp', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const handler = vi.fn();
        await getCourseDetails('101770', '1', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                school: 'College of Arts and Science',
                hours: '4.0',
                grading: 'Student Option Grading Basis'
            }),
            expect.any(Number) // timestamp
        );
    });

    it('should handle courses with missing optional fields', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockMinimalHtml
        } as any);

        const details = await getCourseDetails('999999');

        expect(details).toEqual({
            school: null,
            hours: null,
            grading: null,
            components: [],
            typicallyOffered: null,
            requirements: null,
            attributes: [],
            description: null
        });
    });

    it('should work without a handler', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        const details = await getCourseDetails('101770');

        expect(details).toBeDefined();
        expect(details.school).toBe('College of Arts and Science');
    });

    it('should default offerNumber to "1" when not provided', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockCourseDetailsHtml
        } as any);

        await getCourseDetails('101770');

        expect(mockGot).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                searchParams: {
                    id: '101770',
                    offerNumber: '1'
                }
            })
        );
    });

    it('should handle single component courses', async () => {
        const singleComponentHtml = `
            <html>
                <body>
                    <div id="courseDetailDialog" class="dialogPanel">
                        <h1>Computer Science 1101 - Programming and Problem Solving</h1>
                        <div id="mainSection">
                            <div class="detailPanel">
                                <table class="nameValueTable">
                                    <tr>
                                        <td class="label"><strong>Components:</strong></td>
                                        <td>
                                            <div>Lecture&nbsp;(Required)</div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div id="rightSection">
                            <div class="detailPanel">
                                <table class="nameValueTable"></table>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: singleComponentHtml
        } as any);

        const details = await getCourseDetails('12345');

        expect(details.components).toEqual(['Lecture']);
        expect(details.components).toHaveLength(1);
    });

    it('should trim whitespace from all fields', async () => {
        const whitespaceHtml = `
            <html>
                <body>
                    <div id="courseDetailDialog" class="dialogPanel">
                        <h1>Test 1000 - Test</h1>
                        <div id="mainSection">
                            <div class="detailPanel">
                                <table class="nameValueTable">
                                    <tr>
                                        <td class="label"><strong>School:</strong></td>
                                        <td>   School of Engineering   </td>
                                    </tr>
                                    <tr>
                                        <td class="label"><strong>Grading Basis:</strong></td>
                                        <td>  Standard Grading  </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div id="rightSection">
                            <div class="detailPanel">
                                <table class="nameValueTable">
                                    <tr>
                                        <td class="label"><strong>Typically Offered:</strong></td>
                                        <td>  Fall, Spring  </td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: whitespaceHtml
        } as any);

        const details = await getCourseDetails('12345');

        expect(details.school).toBe('School of Engineering');
        expect(details.grading).toBe('Standard Grading');
        expect(details.typicallyOffered).toBe('Fall, Spring');
    });

    it('should handle decimal credit hours', async () => {
        const decimalHoursHtml = `
            <html>
                <body>
                    <div id="courseDetailDialog" class="dialogPanel">
                        <h1>Test 1000 - Test</h1>
                        <div id="mainSection">
                            <div class="detailPanel">
                                <table class="nameValueTable">
                                    <tr>
                                        <td class="label"><strong>Units:</strong></td>
                                        <td>2.5</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                        <div id="rightSection">
                            <div class="detailPanel">
                                <table class="nameValueTable"></table>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: decimalHoursHtml
        } as any);

        const details = await getCourseDetails('12345');

        expect(details.hours).toBe('2.5');
    });

    it('should handle "Requirements" label (plural)', async () => {
        const requirementsHtml = `
            <html>
                <body>
                    <div id="courseDetailDialog" class="dialogPanel">
                        <h1>Test 1000 - Test</h1>
                        <div id="mainSection">
                            <div class="detailPanel">
                                <table class="nameValueTable"></table>
                            </div>
                        </div>
                        <div id="rightSection">
                            <div class="detailPanel">
                                <table class="nameValueTable">
                                    <tr>
                                        <td class="label"><strong>Requirements:</strong></td>
                                        <td>Must have completed MATH 1200</td>
                                    </tr>
                                </table>
                            </div>
                        </div>
                    </div>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: requirementsHtml
        } as any);

        const details = await getCourseDetails('12345');

        expect(details.requirements).toBe('Must have completed MATH 1200');
    });
});
