import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sectionExists } from '../../../src/scraping/scrapers/functions.js';
import got from 'got';

vi.mock('got');

describe('sectionExists', () => {
    const sectionId = '12345';
    const termId = '1040';

    // Mock HTML response for an existing section
    const mockExistingSection = `
        <html>
            <body>
                <div class="section-details">
                    <p>Class Number: 12345</p>
                    <p>Course: CS 1101 - Programming and Problem Solving</p>
                    <p>Instructor: John Doe</p>
                </div>
            </body>
        </html>
    `;

    // Mock HTML response for a non-existing section
    const mockNonExistingSection = `
        <html>
            <body>
                <div class="error">
                    <p>Section not found</p>
                </div>
            </body>
        </html>
    `;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should return true when section exists', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockExistingSection
        } as any);

        const result = await sectionExists(sectionId, termId);

        expect(result).toBe(true);

        // Verify got was called with correct parameters
        expect(mockGot).toHaveBeenCalledWith(
            expect.stringContaining('GetClassSectionDetail.action'),
            expect.objectContaining({
                searchParams: {
                    classNumber: sectionId,
                    termCode: termId
                }
            })
        );
    });

    it('should return false when section does not exist', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockNonExistingSection
        } as any);

        const result = await sectionExists(sectionId, termId);

        expect(result).toBe(false);

        // Verify got was called correctly
        expect(mockGot).toHaveBeenCalledTimes(1);
    });

    it('should call handler with result', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockExistingSection
        } as any);

        const handler = vi.fn();
        await sectionExists(sectionId, termId, handler);

        // Handler should be called once with true and a timestamp
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(true, expect.any(Number));
    });

    it('should call handler with false when section does not exist', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockNonExistingSection
        } as any);

        const handler = vi.fn();
        await sectionExists(sectionId, termId, handler);

        // Handler should be called with false
        expect(handler).toHaveBeenCalledTimes(1);
        expect(handler).toHaveBeenCalledWith(false, expect.any(Number));
    });

    it('should work without a handler', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: mockExistingSection
        } as any);

        const result = await sectionExists(sectionId, termId);

        expect(result).toBeDefined();
        expect(typeof result).toBe('boolean');
        expect(result).toBe(true);
    });

    it('should detect class number pattern correctly', async () => {
        const mockGot = vi.mocked(got);

        // Test with different formats of class number
        const bodyWithClassNumber = `
            <html>
                <body>
                    <div>
                        <span>Class Number: 99999</span>
                    </div>
                </body>
            </html>
        `;

        mockGot.mockResolvedValueOnce({
            body: bodyWithClassNumber
        } as any);

        const result = await sectionExists('99999', termId);

        expect(result).toBe(true);
    });

    it('should return false when class number pattern is missing', async () => {
        const mockGot = vi.mocked(got);

        const bodyWithoutClassNumber = `
            <html>
                <body>
                    <div>
                        <p>Error: Invalid section</p>
                        <p>Please check the section number and try again</p>
                    </div>
                </body>
            </html>
        `;

        mockGot.mockResolvedValueOnce({
            body: bodyWithoutClassNumber
        } as any);

        const result = await sectionExists(sectionId, termId);

        expect(result).toBe(false);
    });

    it('should handle empty response body', async () => {
        const mockGot = vi.mocked(got);

        mockGot.mockResolvedValueOnce({
            body: ''
        } as any);

        const result = await sectionExists(sectionId, termId);

        expect(result).toBe(false);
    });

    it('should verify section with different section IDs', async () => {
        const mockGot = vi.mocked(got);

        const differentSectionId = '54321';
        const bodyWithDifferentSection = `Class Number: ${differentSectionId}`;

        mockGot.mockResolvedValueOnce({
            body: bodyWithDifferentSection
        } as any);

        const result = await sectionExists(differentSectionId, termId);

        expect(result).toBe(true);
        expect(mockGot).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                searchParams: {
                    classNumber: differentSectionId,
                    termCode: termId
                }
            })
        );
    });

    it('should verify section with different term IDs', async () => {
        const mockGot = vi.mocked(got);

        const differentTermId = '1045';

        mockGot.mockResolvedValueOnce({
            body: mockExistingSection
        } as any);

        await sectionExists(sectionId, differentTermId);

        expect(mockGot).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                searchParams: {
                    classNumber: sectionId,
                    termCode: differentTermId
                }
            })
        );
    });
});
