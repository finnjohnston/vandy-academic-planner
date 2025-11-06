import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClassDetails } from '../../../src/scraping/scrapers/functions.js';
import got from 'got';

vi.mock('got');

describe('getClassDetails', () => {
    const mockClassDetailsHtml = `
        <div id="classSectionDetailDialog" class="dialogPanel">

           <h1>MATH-1301-01&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;
           Accelerated Single-Variable Calculus II</h1>
           <div class="classNumber">Class Number: 1898</div>

           <div id="mainSection">

               <div class="detailHeader">
                  Details
               </div>

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
                           <td class="label">Career:</td>
                           <td>Undergraduate</td>
                        </tr>
                       <tr>
                          <td class="label">Component:</td>
                          <td>Lecture</td>
                       </tr>
                       <tr>
                          <td class="label">Hours:</td>
                          <td>4.0</td>
                       </tr>
                       <tr>
                          <td class="label">Grading Basis:</td>
                          <td>Student Option Grading Basis</td>
                       </tr>
                        <tr>
                          <td class="label"><strong>Associated Component(s):</strong></td>
                          <td>

                                <div>
                                   Lecture
                                </div>

                                <div>
                                   Discussion
                                </div>

                          </td>
                       </tr>
                       <tr>
                          <td class="label">Consent:</td>
                          <td>No Special Consent Required</td>
                       </tr>
                     </table>
                     </td>
                     <td>
                     <table>
                        <tr>
                          <td class="label">Term:</td>
                          <td>2026 Spring</td>
                       </tr>
                       <tr>
                          <td class="label">Session:</td>
                          <td>Regular Academic Session</td>
                       </tr>
                       <tr>
                          <td class="label">Session Dates:</td>
                          <td>1/5/26 - 4/20/26</td>
                       </tr>
                       <tr>
                          <td class="label">Requirement(s):</td>
                          <td>MATH 1300 or 1201 is a prerequisite to this course. Not open to students who have earned credit for MATH 1201 without permission.</td>
                       </tr>

                       <tr>
                          <td class="label">Books:</td>
                          <td>
                             <a href="#">View Books</a>
                          </td>
                       </tr>
                     </table>
                     </td>
                  </tr>
               </table>
               </div>

               <div class="detailHeader">Description</div>
               <div class="detailPanel">
                  Differentiation and integration of transcendental functions, applications, methods of integration, coordinate geometry, polar coordinates, infinite series.
               </div>
           </div>

           <div id="rightSection">
               <div class="detailHeader">Attributes</div>
               <div class="detailPanel">
                  <div class="listItem">CORE: B-Systemic &amp; Structural Reasoning</div>
                  <div class="listItem">LE: MNS-Math and Natural Sciences</div>
                  <div class="listItem">AXLE: Math and Natural Sciences</div>
               </div>
           </div>
        </div>
    `;

    const mockMinimalHtml = `
        <div id="classSectionDetailDialog" class="dialogPanel">
           <h1>TEST-1000-01 : Test Course</h1>
           <div class="classNumber">Class Number: 9999</div>
           <div id="mainSection"></div>
           <div id="rightSection"></div>
        </div>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and parse complete class details', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details).toEqual({
            school: 'College of Arts and Science',
            hours: 4.0,
            grading: 'Student Option Grading Basis',
            components: ['Lecture', 'Discussion'],
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
            expect.stringContaining('GetClassSectionDetail.action'),
            expect.objectContaining({
                searchParams: {
                    classNumber: '1898',
                    termCode: '1040'
                }
            })
        );
    });

    it('should parse hours correctly', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details.hours).toBe(4.0);
        expect(typeof details.hours).toBe('number');
    });

    it('should extract components from both Component and Associated Component(s) fields', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details.components).toEqual(['Lecture', 'Discussion']);
        expect(details.components).toHaveLength(2);
    });

    it('should not duplicate components when they appear in both fields', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        // Lecture appears in both Component and Associated Component(s), should only appear once
        const lectureCount = details.components.filter(c => c === 'Lecture').length;
        expect(lectureCount).toBe(1);
    });

    it('should extract multiple attributes correctly', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details.attributes).toHaveLength(3);
        expect(details.attributes).toContain('CORE: B-Systemic & Structural Reasoning');
        expect(details.attributes).toContain('LE: MNS-Math and Natural Sciences');
        expect(details.attributes).toContain('AXLE: Math and Natural Sciences');
    });

    it('should handle HTML entities in attributes', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        // The &amp; should be decoded to &
        expect(details.attributes[0]).toContain('&');
        expect(details.attributes[0]).not.toContain('&amp;');
    });

    it('should call handler with class details and timestamp', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const handler = vi.fn();
        await getClassDetails('1898', '1040', handler);

        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(
            expect.objectContaining({
                school: 'College of Arts and Science',
                hours: 4.0,
                grading: 'Student Option Grading Basis'
            }),
            expect.any(Number) // timestamp
        );
    });

    it('should handle classes with missing optional fields', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockMinimalHtml
        } as any);

        const details = await getClassDetails('9999', '1040');

        expect(details).toEqual({
            school: null,
            hours: null,
            grading: null,
            components: [],
            requirements: null,
            attributes: [],
            description: null
        });
    });

    it('should work without a handler', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details).toBeDefined();
        expect(details.school).toBe('College of Arts and Science');
    });

    it('should handle single component classes', async () => {
        const singleComponentHtml = `
            <div id="classSectionDetailDialog" class="dialogPanel">
               <h1>CS-1101-01 : Programming and Problem Solving</h1>
               <div class="classNumber">Class Number: 1234</div>
               <div id="mainSection">
                   <div class="detailHeader">Details</div>
                   <div class="detailPanel">
                       <table class="nameValueTable">
                           <tr>
                               <td>
                                   <table>
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

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: singleComponentHtml
        } as any);

        const details = await getClassDetails('1234', '1040');

        expect(details.components).toEqual(['Lecture']);
        expect(details.components).toHaveLength(1);
    });

    it('should trim whitespace from all fields', async () => {
        const whitespaceHtml = `
            <div id="classSectionDetailDialog" class="dialogPanel">
               <h1>TEST-1000-01 : Test</h1>
               <div class="classNumber">Class Number: 1234</div>
               <div id="mainSection">
                   <div class="detailHeader">Details</div>
                   <div class="detailPanel">
                       <table class="nameValueTable">
                           <tr>
                               <td>
                                   <table>
                                       <tr>
                                           <td class="label">School:</td>
                                           <td>   School of Engineering   </td>
                                       </tr>
                                       <tr>
                                           <td class="label">Grading Basis:</td>
                                           <td>  Standard Grading  </td>
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

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: whitespaceHtml
        } as any);

        const details = await getClassDetails('1234', '1040');

        expect(details.school).toBe('School of Engineering');
        expect(details.grading).toBe('Standard Grading');
    });

    it('should handle decimal credit hours', async () => {
        const decimalHoursHtml = `
            <div id="classSectionDetailDialog" class="dialogPanel">
               <h1>TEST-1000-01 : Test</h1>
               <div class="classNumber">Class Number: 1234</div>
               <div id="mainSection">
                   <div class="detailHeader">Details</div>
                   <div class="detailPanel">
                       <table class="nameValueTable">
                           <tr>
                               <td>
                                   <table>
                                       <tr>
                                           <td class="label">Hours:</td>
                                           <td>2.5</td>
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

        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: decimalHoursHtml
        } as any);

        const details = await getClassDetails('1234', '1040');

        expect(details.hours).toBe(2.5);
    });

    it('should extract description from Description section', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockClassDetailsHtml
        } as any);

        const details = await getClassDetails('1898', '1040');

        expect(details.description).toBeDefined();
        expect(details.description).toContain('Differentiation and integration of transcendental functions');
    });
});
