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

    constructor(cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
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

                const courses: CatalogCourse[] = await this.searchCourses(searchA, handler);

                this.discoverCourses(courses);

                if (courses.length >= 300) {
                    await this.searchByBracketedIncreases(searchA, handler);
                }
            }

            if (!this.BLACKLISTED_CODES.includes(searchB) && !this.searchedTerms.includes(searchB)) {
                this.searchedTerms.push(searchB);

                const courses: CatalogCourse[] = await this.searchCourses(searchB, handler);

                this.discoverCourses(courses);

                if (courses.length >= 300) {
                    await this.searchByBracketedIncreases(searchB, handler);
                }
            }
        }
    }

    private async searchCourses(keywords: string, handler: StreamedResponseHandler<CatalogCourse>): Promise<CatalogCourse[]> {
        const url = `${YES_BASE_URL}/SearchCoursesExecute!search.action`;

        const response = await got(url, {
            cookieJar: this.cookieJar,
            searchParams: {
                keywords: keywords
            }
        });

        const $ = load(response.body);

        // Extract courseIds and subject codes from the search results
        // The structure is:
        // - Script tags define functions showCourseDetail_N with course IDs
        // - Table rows have cells that call showCourseDetail_N()
        // - First <td> in each row contains the subject code

        interface CourseInfo {
            courseId: string;
            subjectCode: string;
        }

        const courseMap = new Map<number, CourseInfo>();

        // Extract courseIds from JavaScript functions (indexed by function number)
        $('script').each(function(this: any) {
            const scriptContent = $(this).html();
            if (scriptContent && scriptContent.includes('showCourseDetail')) {
                // Pattern: function showCourseDetail_0( ... ) { ... showCourseDetail('121926', '1', ...) }
                const funcRegex = /function\s+showCourseDetail_(\d+)/;
                const funcMatch = scriptContent.match(funcRegex);

                if (funcMatch) {
                    const index = parseInt(funcMatch[1]);
                    const idRegex = /YAHOO\.mis\.student\.CourseDetailPanel\.showCourseDetail\('(\d+)',\s*'(\d+)'/;
                    const idMatch = scriptContent.match(idRegex);

                    if (idMatch) {
                        const courseId = idMatch[1];
                        if (!courseMap.has(index)) {
                            courseMap.set(index, { courseId, subjectCode: '' });
                        } else {
                            courseMap.get(index)!.courseId = courseId;
                        }
                    }
                }
            }
        });

        // Extract subject codes from table rows (indexed by row position)
        let rowIndex = 0;
        $('#courseSearchResultTable tr.classRow').each(function(this: any) {
            const firstCell = $(this).find('td').first();
            const subjectCode = firstCell.text().trim();

            if (subjectCode) {
                if (!courseMap.has(rowIndex)) {
                    courseMap.set(rowIndex, { courseId: '', subjectCode });
                } else {
                    courseMap.get(rowIndex)!.subjectCode = subjectCode;
                }
            }
            rowIndex++;
        });

        // Filter to only complete entries and deduplicate by courseId
        const seenCourseIds = new Set<string>();
        const courseInfos: CourseInfo[] = [];

        for (const info of courseMap.values()) {
            if (info.courseId && info.subjectCode && !seenCourseIds.has(info.courseId)) {
                courseInfos.push(info);
                seenCourseIds.add(info.courseId);
            }
        }

        // Fetch details for each course
        const courses: CatalogCourse[] = [];
        for (const { courseId, subjectCode } of courseInfos) {
            const scraper = new CourseQueryScraper(courseId, '1', subjectCode, this.cookieJar, this.startTime());
            const courseResults = await scraper.scrape(handler);
            if (courseResults.length > 0) {
                courses.push(courseResults[0]);
            }
        }

        return courses;
    }

    private discoverCourses(courses: CatalogCourse[]) {
        const existingIDs = this.discoveredCourses.map(c => c.id);

        const toAdd = courses.filter(c => !existingIDs.includes(c.id));
        this.discoveredCourses.push(...toAdd);
    }
}
