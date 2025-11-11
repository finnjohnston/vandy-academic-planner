import {YES_BASE_URL} from "../config.js";
import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import got from "got";
import {load} from "cheerio";
import {CookieJar} from "tough-cookie";
import {CatalogCourse, CourseDetails, CourseID} from "../types/course.type.js";

export class CourseQueryScraper extends Scraper<CatalogCourse> {

    private courseId: CourseID;
    private offerNumber: string;

    constructor(courseId: CourseID, offerNumber: string = '1', cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.courseId = courseId;
        this.offerNumber = offerNumber;
    }

    override async scrape(handler: StreamedResponseHandler<CatalogCourse> = () => {}): Promise<CatalogCourse[]> {
        this.markStart();

        const url = `${YES_BASE_URL}/GetCourseDetail.action`;
        const request = await got(url, {
            cookieJar: this.cookieJar,
            searchParams: {
                id: this.courseId,
                offerNumber: this.offerNumber
            }
        });

        const body = request.body;
        const course: CatalogCourse = this.extractCourseFromBody(body);
        await handler(course, this.timeSinceStart());

        return [course];
    }

    private extractCourseFromBody(body: string): CatalogCourse {
        const $ = load(body);

        // Parse the h1 to get course info
        // Format: "Computer Science 1101 - Programming and Problem Solving"
        // or could be: "Mathematics 1300 - Accelerated Single-Variable Calculus I"
        const h1Text = $('#courseDetailDialog h1').text().trim();

        let subject = '';
        let abbreviation = '';
        let name = '';

        // Split by " - " to separate course identifier from name
        const parts = h1Text.split(' - ');
        if (parts.length >= 2) {
            const courseIdentifier = parts[0].trim(); // "Computer Science 1101"
            name = parts.slice(1).join(' - ').trim(); // "Programming and Problem Solving"

            // Extract subject name and number
            // Match: words followed by numbers
            const match = courseIdentifier.match(/^(.+?)\s+(\d+)$/);
            if (match) {
                const fullSubjectName = match[1].trim(); // "Computer Science"
                const courseNumber = match[2].trim(); // "1101"

                // Create abbreviation from first letters of each word
                subject = fullSubjectName.split(' ')
                    .map(word => word.charAt(0).toUpperCase())
                    .join(''); // "CS"

                abbreviation = `${subject} ${courseNumber}`; // "CS 1101"
            }
        }

        // Extract course details
        const details: CourseDetails = this.extractDetailsFromBody($);

        return {
            id: this.courseId,
            subject: subject,
            abbreviation: abbreviation,
            name: name,
            details: details
        };
    }

    private extractDetailsFromBody($: any): CourseDetails {
        // Initialize the details object
        let details: CourseDetails = {
            school: null,
            hours: null,
            grading: null,
            components: [],
            typicallyOffered: null,
            requirements: null,
            attributes: [],
            description: null
        };

        // Process main section details table
        $('#mainSection .detailPanel table.nameValueTable tr').each(function(this: any) {
            const label = $(this).find('td.label strong').text().trim().replace(':', '');
            const valueCell = $(this).find('td:not(.label)');

            switch(label.toLowerCase()) {
                case 'school':
                    details.school = valueCell.text().trim();
                    break;
                case 'units':
                    details.hours = valueCell.text().trim();
                    break;
                case 'grading basis':
                    details.grading = valueCell.text().trim();
                    break;
                case 'components':
                    // Components are in nested divs (e.g., "Lecture (Required)")
                    details.components = [];
                    valueCell.find('div').each(function(this: any) {
                        const componentText = $(this).text().trim();
                        // Extract component name before parenthesis or nbsp
                        const cleaned = componentText.replace(/\u00a0/g, ' '); // Replace nbsp with space
                        const componentMatch = cleaned.match(/^(.+?)(?:\s*\(|$)/);
                        if (componentMatch) {
                            details.components.push(componentMatch[1].trim());
                        }
                    });
                    break;
            }
        });

        // Process right section enrollment information
        $('#rightSection .detailPanel table.nameValueTable tr').each(function(this: any) {
            const label = $(this).find('td.label strong').text().trim().replace(':', '');
            const valueCell = $(this).find('td:not(.label)');

            switch(label.toLowerCase()) {
                case 'typically offered':
                    details.typicallyOffered = valueCell.text().trim();
                    break;
                case 'requirement':
                case 'requirements':
                    details.requirements = valueCell.text().trim();
                    break;
                case 'attributes':
                    details.attributes = [];
                    valueCell.find('div').each(function(this: any) {
                        const attrText = $(this).text().trim();
                        if (attrText) {
                            details.attributes.push(attrText);
                        }
                    });
                    break;
            }
        });

        // Extract description - it's in a separate section
        $('#courseDetailDialog').children().each(function(this: any) {
            if ($(this).hasClass('detailHeader') && $(this).text().trim() === 'Description') {
                const descriptionPanel = $(this).next('.detailPanel');
                if (descriptionPanel.length) {
                    details.description = descriptionPanel.text().trim();
                }
            }
        });

        return details;
    }
}
