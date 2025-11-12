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
        const courseIds: string[] = [];

        // Extract courseIds from JavaScript functions
        // Pattern: YAHOO.mis.student.CourseDetailPanel.showCourseDetail('102715', '1', notificationString);
        $('script').each(function(this: any) {
            const scriptContent = $(this).html();
            if (scriptContent && scriptContent.includes('showCourseDetail')) {
                const regex = /YAHOO\.mis\.student\.CourseDetailPanel\.showCourseDetail\('(\d+)',\s*'(\d+)'/g;
                let match;
                while ((match = regex.exec(scriptContent)) !== null) {
                    const courseId = match[1];
                    if (!courseIds.includes(courseId)) {
                        courseIds.push(courseId);
                    }
                }
            }
        });

        // Fetch details for each course
        const courses: CatalogCourse[] = [];
        for (const courseId of courseIds) {
            const scraper = new CourseQueryScraper(courseId, '1', this.cookieJar, this.startTime());
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
