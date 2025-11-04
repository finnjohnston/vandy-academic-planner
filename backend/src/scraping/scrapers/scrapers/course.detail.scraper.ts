import {YES_BASE_URL} from "../config.js";
import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import got from "got";
import {load} from "cheerio";
import {CookieJar} from "tough-cookie";
import {CourseDetails, CourseID} from "../types/course.type.js";

export class CourseDetailScraper extends Scraper<CourseDetails> {

    private courseId: CourseID;
    private offerNumber: string;

    constructor(courseId: CourseID, offerNumber: string = '1', cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.courseId = courseId;
        this.offerNumber = offerNumber;
    }

    override async scrape(handler: StreamedResponseHandler<CourseDetails> = (_) => {}): Promise<CourseDetails[]> {
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
        const details: CourseDetails = this.extractDetailsFromBody(body);
        await handler(details, this.timeSinceStart());

        return [details];
    }

    private extractDetailsFromBody(body: string): CourseDetails {
        const $ = load(body);

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
                    const unitsText = valueCell.text().trim();
                    const unitsMatch = unitsText.match(/(\d+(?:\.\d+)?)/);
                    if (unitsMatch) {
                        details.hours = parseFloat(unitsMatch[1]);
                    }
                    break;
                case 'grading basis':
                    details.grading = valueCell.text().trim();
                    break;
                case 'components':
                    // Components are in nested divs (e.g., "Lecture (Required)")
                    details.components = [];
                    valueCell.find('div').each(function(this: any) {
                        const componentText = $(this).text().trim();
                        // Extract component name before parenthesis (e.g., "Lecture" from "Lecture (Required)")
                        const componentMatch = componentText.match(/^(.+?)(?:\s*\(|$)/);
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