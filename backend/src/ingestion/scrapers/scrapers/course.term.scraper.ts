import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import {CookieJar} from "tough-cookie";
import {CatalogCourse} from "../types/course.type.js";
import {CourseQueryScraper} from "./course.query.scraper.js";
import {YES_BASE_URL} from "../config.js";
import got from "got";
import {load} from "cheerio";

export class CourseTermScraper extends Scraper<CatalogCourse> {

    private readonly BLACKLISTED_CODES = [
        '3850', '3851', '3852', // Independent reading/study
        '7999', // Master's Thesis Research
        '8999', // Non candidate research
        '9999' // Ph.D dissertation research
    ];

    private searchedTerms: string[] = [];

    private discoveredCourses: CatalogCourse[] = [];

    private subjectFilter?: string;

    constructor(cookieJar?: CookieJar, startTime?: number, subjectFilter?: string) {
        super(cookieJar, startTime);
        this.subjectFilter = subjectFilter;
    }

    override async scrape(handler: StreamedResponseHandler<CatalogCourse> = () => {
    }): Promise<CatalogCourse[]> {
        this.markStart();

        this.searchedTerms = [];
        this.discoveredCourses = [];

        // Trigger the recursive call.
        await this.searchByBracketedIncreases('', handler);

        return this.discoveredCourses;
    }

    // Searches from 0[base] --> 9[base] then [base]0 --> [base]9
    // if there are 300 results or more, we recurse!
    private async searchByBracketedIncreases(base: string, handler: StreamedResponseHandler<CatalogCourse>): Promise<void> {
        for (let i = 0; i < 10; i++) {
            let searchA = `${i}${base}`;
            let searchB = `${base}${i}`;

            if (!this.BLACKLISTED_CODES.includes(searchA) && !this.searchedTerms.includes(searchA)) {
                this.searchedTerms.push(searchA);

                const result = await this.searchCourses(searchA, handler);

                this.discoverCourses(result.courses);

                // Use totalCount (before subject filtering) to decide if we need to recurse
                if (result.totalCount >= 300) {
                    await this.searchByBracketedIncreases(searchA, handler);
                }
            }

            if (!this.BLACKLISTED_CODES.includes(searchB) && !this.searchedTerms.includes(searchB)) {
                this.searchedTerms.push(searchB);

                const result = await this.searchCourses(searchB, handler);

                this.discoverCourses(result.courses);

                // Use totalCount (before subject filtering) to decide if we need to recurse
                if (result.totalCount >= 300) {
                    await this.searchByBracketedIncreases(searchB, handler);
                }
            }
        }
    }

    private async searchCourses(keywords: string, handler: StreamedResponseHandler<CatalogCourse>): Promise<{ courses: CatalogCourse[], totalCount: number }> {
        const url = `${YES_BASE_URL}/SearchCoursesExecute!search.action`;

        const response = await got(url, {
            cookieJar: this.cookieJar,
            searchParams: {
                keywords: keywords
            }
        });

        const $ = load(response.body);

        // Extract courseIds and subject codes from the search results
        // Strategy: Parse table rows and extract both subject code and course ID from each row
        // - First <td> contains the subject code
        // - onclick attribute references the function name (e.g., showCourseDetail_0)
        // - Find the matching script to get the course ID

        interface CourseInfo {
            courseId: string;
            subjectCode: string;
            courseNumber: string; // e.g., "1101", "1101L", "2000W"
        }

        // First, build a map of function name -> course ID from all scripts
        const functionToCourseId = new Map<string, string>();
        $('script').each(function(this: any) {
            const scriptContent = $(this).html();
            if (scriptContent && scriptContent.includes('showCourseDetail')) {
                // Extract function name: function showCourseDetail_0(...)
                const funcRegex = /function\s+(showCourseDetail_\d+)/;
                const funcMatch = scriptContent.match(funcRegex);

                if (funcMatch) {
                    const functionName = funcMatch[1];
                    // Extract course ID: showCourseDetail('121926', '1', ...)
                    const idRegex = /YAHOO\.mis\.student\.CourseDetailPanel\.showCourseDetail\('(\d+)',\s*'(\d+)'/;
                    const idMatch = scriptContent.match(idRegex);

                    if (idMatch) {
                        const courseId = idMatch[1];
                        functionToCourseId.set(functionName, courseId);
                    }
                }
            }
        });

        // Now parse table rows to get subject codes and match with course IDs
        const courseMap = new Map<string, CourseInfo>();

        $('#courseSearchResultTable tr.classRow').each(function(this: any) {
            const row = $(this);

            // Get subject code from first cell
            const subjectCode = row.find('td').eq(0).text().trim();

            // Get course number from third cell (index 2)
            const courseNumber = row.find('td').eq(2).text().trim();

            // Get function name from onclick attribute
            const onclick = row.find('td').first().attr('onclick');
            if (onclick && subjectCode && courseNumber) {
                // Extract function name from onclick="showCourseDetail_0()"
                const funcMatch = onclick.match(/(showCourseDetail_\d+)/);
                if (funcMatch) {
                    const functionName = funcMatch[1];
                    const courseId = functionToCourseId.get(functionName);

                    if (courseId) {
                        // Use courseId as key to automatically deduplicate
                        courseMap.set(courseId, { courseId, subjectCode, courseNumber });
                    }
                }
            }
        });

        // Convert map values to array (already deduplicated by courseId within this search result)
        let courseInfos: CourseInfo[] = Array.from(courseMap.values());

        // Store total count BEFORE filtering (for recursion threshold decision)
        const totalCount = courseInfos.length;

        // Filter by subject if a filter is provided
        if (this.subjectFilter) {
            courseInfos = courseInfos.filter(info => info.subjectCode === this.subjectFilter);
        }

        // Filter to undergrad courses only (< 5000)
        courseInfos = courseInfos.filter(info => {
            // Extract numeric part from course number (e.g., "1000L" -> 1000, "2123" -> 2123)
            const numMatch = info.courseNumber.match(/^(\d+)/);
            if (!numMatch) return false;
            const courseNum = parseInt(numMatch[1]);
            return courseNum < 5000;
        });

        // Filter out courses that have already been discovered (deduplication across searches)
        const existingIDs = this.discoveredCourses.map(c => c.id);
        const newCourseInfos = courseInfos.filter(info => !existingIDs.includes(info.courseId));

        // Fetch details for all new courses in parallel
        const fetchPromises = newCourseInfos.map(async ({ courseId, subjectCode }) => {
            const scraper = new CourseQueryScraper(courseId, '1', subjectCode, this.cookieJar, this.startTime());
            const courseResults = await scraper.scrape(handler);
            return courseResults.length > 0 ? courseResults[0] : null;
        });

        const courseResults = await Promise.all(fetchPromises);
        const courses: CatalogCourse[] = courseResults.filter((c): c is CatalogCourse => c !== null);

        return { courses, totalCount };
    }

    private discoverCourses(courses: CatalogCourse[]) {
        const existingIDs = this.discoveredCourses.map(c => c.id);

        const toAdd = courses.filter(c => !existingIDs.includes(c.id));
        this.discoveredCourses.push(...toAdd);
    }
}
