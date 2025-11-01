import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSubjects } from '../../../src/scraping/scrapers/functions.js';
import { Subject } from '../../../src/scraping/scrapers/types/subject.type.js';
import got from 'got';

vi.mock('got');

describe('getSubjects', () => {
    // Mock HTML response based on the expected structure from Vanderbilt's registrar page
    const mockHtmlResponse = `
        <html>
            <body>
                <table id="subjects">
                    <tr>
                        <th>Code</th>
                        <th>Column 2</th>
                        <th>Column 3</th>
                        <th>Name</th>
                    </tr>
                    <tr>
                        <td>CS</td>
                        <td>Some data</td>
                        <td>Some data</td>
                        <td>Computer Science</td>
                    </tr>
                    <tr>
                        <td>MATH</td>
                        <td>Some data</td>
                        <td>Some data</td>
                        <td>Mathematics</td>
                    </tr>
                    <tr>
                        <td>PHYS</td>
                        <td>Some data</td>
                        <td>Some data</td>
                        <td>Physics</td>
                    </tr>
                </table>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and parse subjects from the registrar page', async () => {
        // Mock the got response
        vi.mocked(got).mockResolvedValue({
            body: mockHtmlResponse
        } as any);

        const handler = vi.fn();

        const results = await getSubjects(handler);

        // Verify got was called with the correct URL
        expect(got).toHaveBeenCalledWith(
            'https://registrar.vanderbilt.edu/faculty-staff/course-renumbering/course-renumbering-toc.php'
        );

        // Verify the results contain the expected subjects
        expect(results).toHaveLength(3);
        expect(results[0]).toEqual({
            id: 'CS',
            name: 'Computer Science'
        });
        expect(results[1]).toEqual({
            id: 'MATH',
            name: 'Mathematics'
        });
        expect(results[2]).toEqual({
            id: 'PHYS',
            name: 'Physics'
        });
    });

    it('should call the handler for each subject with timestamp', async () => {
        vi.mocked(got).mockResolvedValue({
            body: mockHtmlResponse
        } as any);

        const handler = vi.fn();

        await getSubjects(handler);

        // Verify handler was called 3 times (once for each subject)
        expect(handler).toHaveBeenCalledTimes(3);

        // Verify handler was called with correct arguments
        expect(handler).toHaveBeenNthCalledWith(
            1,
            { id: 'CS', name: 'Computer Science' },
            expect.any(Number)
        );
        expect(handler).toHaveBeenNthCalledWith(
            2,
            { id: 'MATH', name: 'Mathematics' },
            expect.any(Number)
        );
        expect(handler).toHaveBeenNthCalledWith(
            3,
            { id: 'PHYS', name: 'Physics' },
            expect.any(Number)
        );
    });

    it('should handle async handlers', async () => {
        vi.mocked(got).mockResolvedValue({
            body: mockHtmlResponse
        } as any);

        const asyncHandler = vi.fn().mockResolvedValue(undefined);

        await getSubjects(asyncHandler);

        expect(asyncHandler).toHaveBeenCalledTimes(3);
    });

    it('should skip the header row', async () => {
        vi.mocked(got).mockResolvedValue({
            body: mockHtmlResponse
        } as any);

        const handler = vi.fn();

        const results = await getSubjects(handler);

        // Should not include header row in results
        expect(results).toHaveLength(3);
        expect(results.every((subject: Subject) =>
            subject.id !== 'Code' && subject.name !== 'Name'
        )).toBe(true);
    });

    it('should handle empty table', async () => {
        const emptyTableHtml = `
            <html>
                <body>
                    <table id="subjects">
                        <tr>
                            <th>Code</th>
                            <th>Column 2</th>
                            <th>Column 3</th>
                            <th>Name</th>
                        </tr>
                    </table>
                </body>
            </html>
        `;

        vi.mocked(got).mockResolvedValue({
            body: emptyTableHtml
        } as any);

        const handler = vi.fn();

        const results = await getSubjects(handler);

        expect(results).toHaveLength(0);
        expect(handler).not.toHaveBeenCalled();
    });

    it('should handle missing table gracefully', async () => {
        const noTableHtml = `
            <html>
                <body>
                    <div>No table here</div>
                </body>
            </html>
        `;

        vi.mocked(got).mockResolvedValue({
            body: noTableHtml
        } as any);

        const handler = vi.fn();

        const results = await getSubjects(handler);

        expect(results).toHaveLength(0);
        expect(handler).not.toHaveBeenCalled();
    });

    it('should work without a handler', async () => {
        vi.mocked(got).mockResolvedValue({
            body: mockHtmlResponse
        } as any);

        const results = await getSubjects();

        // Should still return results even without a handler
        expect(results).toHaveLength(3);
        expect(results[0]).toEqual({
            id: 'CS',
            name: 'Computer Science'
        });
    });
});
