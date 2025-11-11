import {YES_BASE_URL} from "../config.js";
import {Scraper, StreamedResponseHandler} from "./utils/scraper.js";
import got from "got";
import {load} from "cheerio";
import {CookieJar} from "tough-cookie";
import {ClassDetails} from "../types/class.type.js";

export class ClassDetailScraper extends Scraper<ClassDetails> {

    private classNumber: string;
    private termCode: string;

    constructor(classNumber: string, termCode: string, cookieJar?: CookieJar, startTime?: number) {
        super(cookieJar, startTime);
        this.classNumber = classNumber;
        this.termCode = termCode;
    }

    override async scrape(handler: StreamedResponseHandler<ClassDetails> = (_) => {
    }): Promise<ClassDetails[]> {
        this.markStart();

        const url = `${YES_BASE_URL}/GetClassSectionDetail.action`;
        const request = await got(url, {
            cookieJar: this.cookieJar,
            searchParams: {
                classNumber: this.classNumber,
                termCode: this.termCode
            }
        });

        const body = request.body;
        const details: ClassDetails = this.extractDetailsFromBody(body);
        await handler(details, this.timeSinceStart());

        return [details];
    }

    private extractDetailsFromBody(body: string): ClassDetails {
        const scraperThis: ClassDetailScraper = this;
        const $ = load(body);

        // Initialize all fields
        let description: string | null = null;
        let school: string | null = null;
        let attributes: string[] = [];
        let requirements: string | null = null;
        let hours: string | null = null;
        let grading: string | null = null;
        let components: string[] = [];

        // Process main section
        $('#mainSection').children().each(function (this: any) {
            if ($(this).hasClass('detailHeader')) {
                const title = $(this).text().trim();
                if (title === 'Description') {
                    description = $(this).next('.detailPanel').text().trim();
                } else if (title === 'Details') {
                    const detailsPanel = $(this).next('.detailPanel');
                    school = scraperThis.extractSchoolFromDetailsPanel($, detailsPanel);
                    requirements = scraperThis.extractRequirementsFromDetailsPanel($, detailsPanel);
                    hours = scraperThis.extractHoursFromDetailsPanel($, detailsPanel);
                    grading = scraperThis.extractGradingFromDetailsPanel($, detailsPanel);
                    components = scraperThis.extractComponentsFromDetailsPanel($, detailsPanel);
                }
            }
        });

        // Process right section for attributes
        $('#rightSection').children().each(function (this: any) {
            if ($(this).hasClass('detailHeader') && $(this).text().trim() === 'Attributes') {
                attributes = scraperThis.extractAttributesFromDetailsPanel($, $(this).next('.detailPanel'));
            }
        });

        return {
            school: school,
            hours: hours,
            grading: grading,
            components: components,
            requirements: requirements,
            attributes: attributes,
            description: description
        };
    }

    private extractSchoolFromDetailsPanel($: any, panelNode: any): string | null {
        let school: string | null = null;
        $(panelNode).find('td.label').each(function (this: any) {
            if ($(this).text().trim() === 'School:') {
                school = $(this).next().text().trim();
            }
        });
        return school;
    }

    private extractRequirementsFromDetailsPanel($: any, panelNode: any): string | null {
        let requirements: string | null = null;
        $(panelNode).find('td.label').each(function (this: any) {
            if ($(this).text().trim() === 'Requirement(s):') {
                const reqText = $(this).next().text().trim();
                if (reqText) {
                    requirements = reqText;
                }
            }
        });
        return requirements;
    }

    private extractHoursFromDetailsPanel($: any, panelNode: any): string | null {
        let hours: string | null = null;
        $(panelNode).find('td.label').each(function (this: any) {
            if ($(this).text().trim() === 'Hours:') {
                hours = $(this).next().text().trim();
            }
        });
        return hours;
    }

    private extractGradingFromDetailsPanel($: any, panelNode: any): string | null {
        let grading: string | null = null;
        $(panelNode).find('td.label').each(function (this: any) {
            if ($(this).text().trim() === 'Grading Basis:') {
                grading = $(this).next().text().trim();
            }
        });
        return grading;
    }

    private extractComponentsFromDetailsPanel($: any, panelNode: any): string[] {
        const components: string[] = [];
        const addedComponents = new Set<string>();
        
        $(panelNode).find('td.label').each(function (this: any) {
            const label = $(this).text().trim();
            
            // Single component field
            if (label === 'Component:') {
                const component = $(this).next().text().trim();
                if (component && !addedComponents.has(component)) {
                    components.push(component);
                    addedComponents.add(component);
                }
            }
            
            // Associated components field (can have multiple)
            if (label === 'Associated Component(s):' || $(this).find('strong').text().trim() === 'Associated Component(s):') {
                $(this).next().find('div').each(function(this: any) {
                    const component = $(this).text().trim();
                    if (component && !addedComponents.has(component)) {
                        components.push(component);
                        addedComponents.add(component);
                    }
                });
            }
        });
        
        return components;
    }

    private extractAttributesFromDetailsPanel($: any, panelNode: any): string[] {
        return $(panelNode).find('.listItem').map(function (this: any) {
            return $(this).text().trim();
        }).get();
    }

}