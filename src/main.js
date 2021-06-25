const Apify = require('apify');

const typedefs = require('./typedefs'); // eslint-disable-line no-unused-vars
const { PersonalDataOptions } = require('./typedefs');

const placesCrawler = require('./places_crawler');
const Stats = require('./stats');
const ErrorSnapshotter = require('./error-snapshotter');
const PlacesCache = require('./places_cache');
const { prepareSearchUrls } = require('./search');
const { createStartRequestsWithWalker } = require('./walker');
const { makeInputBackwardsCompatible, validateInput } = require('./input-validation');
const { log } = Apify.utils;

// NOTE: This scraper is mostly typed with Typescript lint.
// We had to do few ugly things because of that but hopefully it is worth it.

Apify.main(async () => {
    const input = /** @type {typedefs.Input} */ (await Apify.getValue('INPUT'));

    const stats = new Stats();
    await stats.initialize(Apify.events);

    const errorSnapshotter = new ErrorSnapshotter();
    await errorSnapshotter.initialize(Apify.events);

    makeInputBackwardsCompatible(input);
    validateInput(input);

    const {
        // Search and Start URLs
        startUrls, searchStringsArray,
        // Geolocation
        lat, lng, country, state, city, postalCode, zoom = 10, polygon,
        // browser and request options
        pageLoadTimeoutSec = 60, useChrome = false, maxConcurrency, maxPagesPerBrowser = 1, maxPageRetries = 6,
        // Misc
        proxyConfig, debug = false, language = 'en', useStealth = false, headless = true,
        // walker is undocumented feature added by jakubdrobnik, we need to test it and document it
        walker,

        // Scraping options
        includeHistogram = false, includeOpeningHours = false, includePeopleAlsoSearch = false,
        maxReviews = 5, maxImages = 1, exportPlaceUrls = false, additionalInfo = false, maxCrawledPlaces,
        maxAutomaticZoomOut, reviewsSort = 'mostRelevant', reviewsTranslation = 'originalAndTranslated',
        includeReviews = true,

        // Fields used by Heyrick only, not present in the schema (too narrow use-case for now)
        cachePlaces = false, useCachedPlaces = false, cacheKey,

        // Personal data
        scrapeReviewerName = true, scrapeReviewerId = true, scrapeReviewerUrl = true,
        scrapeReviewId = true, scrapeReviewUrl = true, scrapeResponseFromOwnerText = true,

    } = input;

    if (debug) {
        log.setLevel(log.LEVELS.DEBUG);
    }

    // Only used for Heyrick
    // By default, this is not used and thr functions are no-op
    const placesCache = new PlacesCache({ cachePlaces, cacheKey, useCachedPlaces });
    await placesCache.initialize()

    // Requests that are used in the queue, we persist them to skip this step after migration
    const startRequests = /** @type {Apify.RequestOptions[]} */ (await Apify.getValue('START-REQUESTS')) || [];

    const requestQueue = await Apify.openRequestQueue();

    // We declare geolocation as top level variable so it is constructed only once in memory,
    // persisted and then used to check all requests
    let geo;
    let startUrlSearches;
    // We crate geolocation only for search. not for Start URLs
    if (!Array.isArray(startUrls) || startUrls.length === 0) {
        // This call is async because it persists geolocation into KV
        ({ startUrlSearches, geo } = await prepareSearchUrls({
            lat,
            lng,
            zoom,
            country,
            state,
            city,
            postalCode,
            polygon,
        }));
    }

    if (startRequests.length === 0) {
        // Start URLs have higher preference than search
        if (Array.isArray(startUrls) && startUrls.length > 0) {
            if (searchStringsArray) {
                log.warning('\n\n------\nUsing Start URLs disables search. You can use either search or Start URLs.\n------\n');
            }
            const rlist = await Apify.openRequestList('STARTURLS', startUrls);
            let req;
            while (req = await rlist.fetchNextRequest()) { // eslint-disable-line no-cond-assign
                if (!req.url) {
                    log.warning('There is no valid URL for this request:');
                    console.dir(req);
                } else if (req.url.match(/https\:\/\/www\.google\.[a-z.]+\/search/)) {
                    log.warning('ATTENTION! URLs starting with "https://www.google.com/search" '
                        + 'are not supported! Please transform your URL to start with "https://www.google.com/maps"');
                    log.warning(`Happened for provided URL: ${req.url}`);
                } else if (!/google\.[a-z.]+\/maps\/(search|place)\//.test(req.url)) {
                    // allows only search and place urls
                    log.warning('ATTENTION! URL you provided is not '
                        + 'recognized as a valid Google Maps URL. '
                        + 'Please use URLs with /maps/search or /maps/place or contact support@apify.com to add a new format');
                    log.warning(`Happened for provided URL: ${req.url}`);
                } else {
                    // TODO: Seems we don't work on place details???
                    const isPlace = req.url.includes('/maps/place/')
                    startRequests.push({
                        ...req,
                        userData: { label: isPlace ? 'detail' : 'startUrl', searchString: null },
                    });
                }
            }
        } else if (searchStringsArray) {
            for (const searchString of searchStringsArray) {
                // Sometimes users accidentally pass empty strings
                if (typeof searchString !== 'string' || !searchString.trim()) {
                    log.warning(`WRONG INPUT: Search "${searchString}" is not a valid search, skipping`);
                    continue;
                }
                // TODO: walker is not documented!!! We should figure out if it is useful at all
                if (walker) {
                    const walkerGeneratedRequests = createStartRequestsWithWalker({ walker, searchString });
                    for (const req of walkerGeneratedRequests) {
                        startRequests.push(req);
                    }
                } else if (searchString.includes('place_id:')) {
                    /**
                     * User can use place_id:<Google place ID> as search query
                     * TODO: Move place id to separate fields, once we have dependent fields. Than user can fill placeId or search query.
                     */
                    log.info(`Place ID found in search query. We will extract data from ${searchString}.`);
                    const cleanSearch = searchString.replace(/\s+/g, '');
                    // @ts-ignore We know this is correct
                    const placeId = cleanSearch.match(/place_id:(.*)/)[1];
                    startRequests.push({
                        url: `https://www.google.com/maps/search/?api=1&query=${cleanSearch}&query_place_id=${placeId}`,
                        uniqueKey: placeId,
                        userData: { label: 'detail', searchString },
                    });
                } else {
                    // For each search, we use the geolocated URLs
                    for (const startUrlSearch of startUrlSearches) {
                        startRequests.push({
                            url: startUrlSearch,
                            uniqueKey: `${startUrlSearch}+${searchString}`,
                            userData: { label: 'startUrl', searchString },
                        });
                    }
                }
            }

            // use cached place ids for geolocation
            for (const placeId of placesCache.placesInPolygon(geo, maxCrawledPlaces, searchStringsArray)) {
                const searchString = searchStringsArray.filter(x => placesCache.place(placeId).keywords.includes(x))[0];
                startRequests.push({
                    url: `https://www.google.com/maps/search/?api=1&query=${searchString}&query_place_id=${placeId}`,
                    uniqueKey: placeId,
                    userData: { label: 'detail', searchString, rank: null },
                });
            }
        }

        log.info(`Prepared ${startRequests.length} Start URLs (showing max 10):`);
        console.dir(startRequests.map((r) => r.url).slice(0, 10));

        for (const request of startRequests) {
            await requestQueue.addRequest(request);
        }

        await Apify.setValue('START-REQUESTS', startRequests);
        const apifyPlatformKVLink = 'link: https://api.apify.com/v2/key-value-stores/'
            + `${Apify.getEnv().defaultKeyValueStoreId}/records/START-REQUESTS?disableRedirect=true`;
        const localLink = 'local disk: apify_storage/key_value_stores/default/START-REQUESTS.json';
        // @ts-ignore Missing type in SDK
        const link = Apify.getEnv().isAtHome ? apifyPlatformKVLink : localLink;
        log.info(`Full list of Start URLs is available on ${link}`);
    } else {
        log.warning('Actor was restarted, skipping search step because it was already done...');
    }

    /**
     * @type {Apify.PuppeteerPoolOptions}}
     */
    const puppeteerPoolOptions = {
        useIncognitoPages: true,
        maxOpenPagesPerInstance: maxPagesPerBrowser,
    };

    const proxyConfiguration = await Apify.createProxyConfiguration(proxyConfig);

    /** @type {typedefs.CrawlerOptions} */
    const crawlerOptions = {
        requestQueue,
        // @ts-ignore
        proxyConfiguration,
        puppeteerPoolOptions,
        maxConcurrency,
        launchPuppeteerFunction: (options) => {
            return Apify.launchPuppeteer({
                ...options,
                // @ts-ignore The SDK types don't understand Puppeteer options
                headless,
                useChrome,
                args: [
                    // @ts-ignore
                    ...(options.args ? options.args : {}),
                    // this is needed to access cross-domain iframes
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    `--lang=${language}`, // force language at browser level
                ],
                stealth: useStealth,
                stealthOptions: {
                    addLanguage: false,
                    addPlugins: false,
                    emulateConsoleDebug: false,
                    emulateWebGL: false,
                    hideWebDriver: true,
                    emulateWindowFrame: false,
                    hackPermissions: false,
                    mockChrome: false,
                    mockDeviceMemory: false,
                    mockChromeInIframe: false,
                },
            });
        },
        useSessionPool: true,
        persistCookiesPerSession: true,
        // This is just passed to gotoFunction
        pageLoadTimeoutSec,
        // long timeout, because of long infinite scroll
        handlePageTimeoutSecs: 30 * 60,
        maxRequestRetries: maxPageRetries,
    };

    /** @type {PersonalDataOptions} */
    const personalDataOptions = {
        scrapeReviewerName, scrapeReviewerId, scrapeReviewerUrl, scrapeReviewId,
        scrapeReviewUrl, scrapeResponseFromOwnerText,
    }

    /** @type {typedefs.ScrapingOptions} */
    const scrapingOptions = {
        includeHistogram, includeOpeningHours, includePeopleAlsoSearch,
        maxReviews, maxImages, exportPlaceUrls, additionalInfo, maxCrawledPlaces,
        maxAutomaticZoomOut, placesCache, reviewsSort, language,
        multiplier: startRequests.length || 1, // workaround for the maxCrawledPlaces when using multiple queries/startUrls
        geo, reviewsTranslation,
        personalDataOptions,
        includeReviews
    };

    // Create and run crawler
    const crawler = placesCrawler.setUpCrawler({ crawlerOptions, scrapingOptions, stats, errorSnapshotter });

    await crawler.run();
    await stats.saveStats();
    await placesCache.savePlaces();

    log.info('Scraping finished!');
});
