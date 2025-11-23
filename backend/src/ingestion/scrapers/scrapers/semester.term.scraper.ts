import { Scraper, StreamedResponseHandler } from "./utils/scraper.js";
import { CookieJar } from "tough-cookie";
import { Section } from "../types/section.type.js";
import { SemesterClass } from "../types/class.type.js";
import { TermID } from "../types/term.type.js";
import { SectionQueryScraper } from "./section.query.scraper.js";
import { ClassDetailScraper } from "./class.detail.scraper.js";

export interface SemesterData {
    classes: SemesterClass[];
    sections: Section[];
}

/**
 * Unified semester scraper that gets both classes and sections in one pass
 *
 * Strategy:
 * 1. Scrape all sections using the proven recursive search strategy
 * 2. Extract unique classes from the scraped sections
 * 3. Fetch detailed information for each unique class
 * 4. Return both classes (with details) and sections
 *
 * This eliminates the need for a separate class scraper and ensures
 * we get complete coverage by deriving classes from sections.
 */
export class SemesterTermScraper extends Scraper<SemesterData> {

    private readonly term: TermID;
    private readonly BLACKLISTED_CODES = [
        '3850', '3851', '3852', // Independent reading/study
        '7999', // Master's Thesis Research
        '8999', // Non candidate research
        '9999' // Ph.D dissertation research
    ];

    private searchedTerms: string[] = [];
    private discoveredSections: Section[] = [];

    constructor(term: TermID, cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.term = term;
    }

    override async scrape(
        sectionHandler: StreamedResponseHandler<Section> = () => {},
        classHandler: StreamedResponseHandler<SemesterClass> = () => {}
    ): Promise<SemesterData> {
        this.markStart();

        this.searchedTerms = [];
        this.discoveredSections = [];

        // Step 1: Scrape all sections using recursive search
        await this.searchByBracketedIncreases('', sectionHandler);

        // Step 2: Extract unique classes from sections
        const uniqueClasses = this.extractUniqueClasses(this.discoveredSections);

        // Step 3: Fetch class details for each unique class
        const classes = await this.fetchClassDetails(uniqueClasses, classHandler);

        return {
            classes,
            sections: this.discoveredSections
        };
    }

    /**
     * Recursive search strategy using prefix/suffix patterns
     * Same logic as SectionTermScraper - proven to work!
     */
    private async searchByBracketedIncreases(
        base: string,
        handler: StreamedResponseHandler<Section>
    ): Promise<void> {
        for (let i = 0; i < 10; i++) {
            let searchA = `${i}${base}`;  // Prefix pattern (e.g., "1" + "00" = "100")
            let searchB = `${base}${i}`;   // Suffix pattern (e.g., "10" + "0" = "100")

            // Search prefix pattern
            if (!this.BLACKLISTED_CODES.includes(searchA) && !this.searchedTerms.includes(searchA)) {
                this.searchedTerms.push(searchA);

                const scraper = new SectionQueryScraper(searchA, this.term, this.cookieJar, this.startTime());
                const sections: Section[] = await scraper.scrape(handler);

                this.discoverSections(sections);

                // Recurse if hitting the 300 result limit
                if (sections.length >= 300) {
                    await this.searchByBracketedIncreases(searchA, handler);
                }
            }

            // Search suffix pattern (skip if same as prefix to avoid duplicates)
            if (searchB !== searchA && !this.BLACKLISTED_CODES.includes(searchB) && !this.searchedTerms.includes(searchB)) {
                this.searchedTerms.push(searchB);

                const scraper = new SectionQueryScraper(searchB, this.term, this.cookieJar, this.startTime());
                const sections: Section[] = await scraper.scrape(handler);

                this.discoverSections(sections);

                // Recurse if hitting the 300 result limit
                if (sections.length >= 300) {
                    await this.searchByBracketedIncreases(searchB, handler);
                }
            }
        }
    }

    /**
     * Add sections to discovered list, avoiding duplicates
     */
    private discoverSections(sections: Section[]) {
        const existingIDs = this.discoveredSections.map(s => s.id);

        const toAdd = sections.filter(s => !existingIDs.includes(s.id));
        this.discoveredSections.push(...toAdd);
    }

    /**
     * Extract unique classes from sections
     * Groups sections by (subject, courseNumber) to get one class per unique combination
     * Stores the first section found for each class to use its ID for details fetching
     * Filters to undergraduate courses only (< 5000)
     */
    private extractUniqueClasses(sections: Section[]): Map<string, Section> {
        const classMap = new Map<string, Section>();

        for (const section of sections) {
            // Extract numeric part from abbreviation (e.g., "1000L" -> 1000, "2123" -> 2123)
            const numMatch = section.class.abbreviation.match(/^(\d+)/);
            if (!numMatch) continue; // Skip if no numeric prefix

            const courseNum = parseInt(numMatch[1]);
            if (courseNum >= 5000) continue; // Skip graduate courses (5000+)

            const key = `${section.class.subject}:${section.class.abbreviation}:${section.class.name}`;

            // Store first section found for each class (to use its ID for details fetching)
            if (!classMap.has(key)) {
                classMap.set(key, section);
            }
        }

        return classMap;
    }

    /**
     * Fetch detailed information for each unique class
     * Uses ClassDetailScraper with the section ID from the first section of each class
     */
    private async fetchClassDetails(
        uniqueClasses: Map<string, Section>,
        handler: StreamedResponseHandler<SemesterClass>
    ): Promise<SemesterClass[]> {
        const classes: SemesterClass[] = [];

        for (const [key, section] of uniqueClasses.entries()) {
            try {
                // Fetch details using the section's ID
                const detailScraper = new ClassDetailScraper(section.id, this.term, this.cookieJar, this.startTime());
                const details = (await detailScraper.scrape())[0];

                // Create SemesterClass object
                const semesterClass: SemesterClass = {
                    id: section.id, // Use section ID as class ID
                    termId: this.term,
                    subject: section.class.subject,
                    abbreviation: section.class.abbreviation,
                    name: section.class.name,
                    details: details
                };

                classes.push(semesterClass);

                // Call handler for streaming progress
                await handler(semesterClass, this.timeSinceStart());
            } catch (err) {
                console.error(`Failed to fetch details for ${section.class.subject} ${section.class.abbreviation}:`, err);
                // Continue with other classes even if one fails
            }
        }

        return classes;
    }
}
