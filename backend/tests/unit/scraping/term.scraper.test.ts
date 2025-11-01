import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getTerms } from '../../../src/scraping/scrapers/functions.js';
import { Term } from '../../../src/scraping/scrapers/types/term.type.js';
import got from 'got';

vi.mock('got');

describe('getTerms', () => {
    // Mock HTML response for the search classes page
    const mockSearchClassesHtml = `
        <html>
            <body>
                <select id="selectedTerm">
                    <option value="2025Spring">Spring 2025</option>
                    <option value="2024Fall">Fall 2024</option>
                    <option value="2024Summer">Summer 2024</option>
                </select>
            </body>
        </html>
    `;

    // Mock JSON responses for term sessions
    const mockSessionsSpring2025 = [
        {
            code: "1",
            shortDescription: "Full Term",
            longDescription: "Spring 2025 Full Term"
        },
        {
            code: "2",
            shortDescription: "First Half",
            longDescription: "Spring 2025 First Half"
        }
    ];

    const mockSessionsFall2024 = [
        {
            code: "1",
            shortDescription: "Full Term",
            longDescription: "Fall 2024 Full Term"
        }
    ];

    const mockSessionsSummer2024 = [
        {
            code: "1",
            shortDescription: "Full Summer",
            longDescription: "Summer 2024 Full Term"
        },
        {
            code: "2",
            shortDescription: "First Session",
            longDescription: "Summer 2024 First Session"
        },
        {
            code: "3",
            shortDescription: "Second Session",
            longDescription: "Summer 2024 Second Session"
        }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch and parse terms with sessions', async () => {
        // Setup mock responses
        const mockGot = vi.mocked(got);

        // First call: get the search classes page with terms
        mockGot.mockResolvedValueOnce({
            body: mockSearchClassesHtml
        } as any);

        // Subsequent calls: for each term, set session and fetch sessions
        // Spring 2025
        mockGot.mockResolvedValueOnce({ body: '' } as any); // Set term
        mockGot.mockResolvedValueOnce({ body: mockSessionsSpring2025 } as any); // Get sessions

        // Fall 2024
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsFall2024 } as any);

        // Summer 2024
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSummer2024 } as any);

        const handler = vi.fn();
        const results = await getTerms(handler);

        // Verify the results
        expect(results).toHaveLength(3);

        expect(results[0]).toEqual({
            id: '2025Spring',
            title: 'Spring 2025',
            sessions: [
                {
                    id: '1',
                    titleShort: 'Full Term',
                    titleLong: 'Spring 2025 Full Term'
                },
                {
                    id: '2',
                    titleShort: 'First Half',
                    titleLong: 'Spring 2025 First Half'
                }
            ]
        });

        expect(results[1]).toEqual({
            id: '2024Fall',
            title: 'Fall 2024',
            sessions: [
                {
                    id: '1',
                    titleShort: 'Full Term',
                    titleLong: 'Fall 2024 Full Term'
                }
            ]
        });

        expect(results[2]).toEqual({
            id: '2024Summer',
            title: 'Summer 2024',
            sessions: [
                {
                    id: '1',
                    titleShort: 'Full Summer',
                    titleLong: 'Summer 2024 Full Term'
                },
                {
                    id: '2',
                    titleShort: 'First Session',
                    titleLong: 'Summer 2024 First Session'
                },
                {
                    id: '3',
                    titleShort: 'Second Session',
                    titleLong: 'Summer 2024 Second Session'
                }
            ]
        });

        // Verify got was called the correct number of times
        // 1 (initial) + 3 * 2 (set term + get sessions for each term) = 7
        expect(mockGot).toHaveBeenCalledTimes(7);
    });

    it('should call handler for each term with timestamp', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({ body: mockSearchClassesHtml } as any);

        // Mock session responses for all 3 terms
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSpring2025 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsFall2024 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSummer2024 } as any);

        const handler = vi.fn();
        await getTerms(handler);

        // Handler should be called 3 times (once per term)
        expect(handler).toHaveBeenCalledTimes(3);

        // Verify handler received correct data
        expect(handler).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                id: '2025Spring',
                title: 'Spring 2025'
            }),
            expect.any(Number)
        );

        expect(handler).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                id: '2024Fall',
                title: 'Fall 2024'
            }),
            expect.any(Number)
        );

        expect(handler).toHaveBeenNthCalledWith(
            3,
            expect.objectContaining({
                id: '2024Summer',
                title: 'Summer 2024'
            }),
            expect.any(Number)
        );
    });

    it('should handle async handlers', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({ body: mockSearchClassesHtml } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSpring2025 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsFall2024 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSummer2024 } as any);

        const asyncHandler = vi.fn().mockResolvedValue(undefined);
        await getTerms(asyncHandler);

        expect(asyncHandler).toHaveBeenCalledTimes(3);
    });

    it('should work without a handler', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({ body: mockSearchClassesHtml } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSpring2025 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsFall2024 } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: mockSessionsSummer2024 } as any);

        const results = await getTerms();

        expect(results).toHaveLength(3);
        expect(results[0].id).toBe('2025Spring');
    });

    it('should handle empty term list', async () => {
        const emptyHtml = `
            <html>
                <body>
                    <select id="selectedTerm">
                    </select>
                </body>
            </html>
        `;

        vi.mocked(got).mockResolvedValueOnce({
            body: emptyHtml
        } as any);

        const handler = vi.fn();
        const results = await getTerms(handler);

        expect(results).toHaveLength(0);
        expect(handler).not.toHaveBeenCalled();
    });

    it('should handle missing select element gracefully', async () => {
        const noSelectHtml = `
            <html>
                <body>
                    <div>No select here</div>
                </body>
            </html>
        `;

        vi.mocked(got).mockResolvedValueOnce({
            body: noSelectHtml
        } as any);

        const handler = vi.fn();
        const results = await getTerms(handler);

        expect(results).toHaveLength(0);
        expect(handler).not.toHaveBeenCalled();
    });

    it('should handle term with empty sessions', async () => {
        const singleTermHtml = `
            <html>
                <body>
                    <select id="selectedTerm">
                        <option value="2025Spring">Spring 2025</option>
                    </select>
                </body>
            </html>
        `;

        const mockGot = vi.mocked(got);
        mockGot.mockResolvedValueOnce({ body: singleTermHtml } as any);
        mockGot.mockResolvedValueOnce({ body: '' } as any);
        mockGot.mockResolvedValueOnce({ body: [] } as any); // Empty sessions

        const results = await getTerms();

        expect(results).toHaveLength(1);
        expect(results[0]).toEqual({
            id: '2025Spring',
            title: 'Spring 2025',
            sessions: []
        });
    });
});
