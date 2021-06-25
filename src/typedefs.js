const Apify = require('apify'); // eslint-disable-line no-unused-vars

/**
 * Options for the scraping process
 * @typedef ScrapingOptions
 * @property {boolean} includeHistogram
 * @property {boolean} includeOpeningHours
 * @property {boolean} includePeopleAlsoSearch
 * @property {number} maxReviews
 * @property {number} maxImages
 * @property {number} [maxCrawledPlaces]
 * @property {number} [maxAutomaticZoomOut]
 * @property {boolean} exportPlaceUrls
 * @property {boolean} additionalInfo
 * @property {PlacesCache} placesCache
 * @property {string} reviewsSort
 * @property {string} language
 * @property {number} multiplier
 * @property {object} geo
 * @property {string} reviewsTranslation
 * @property {PersonalDataOptions} personalDataOptions
 * @property {boolean} includeReviews
 */

/**
 * Options to set up the crawler
 * @typedef CrawlerOptions
 * @property {Apify.RequestQueue} requestQueue
 * @property {Apify.ProxyConfiguration} [proxyConfiguration]
 * @property {Apify.PuppeteerPoolOptions} puppeteerPoolOptions
 * @property {number} [maxConcurrency]
 * @property {Apify.LaunchPuppeteerFunction} launchPuppeteerFunction
 * @property {boolean} useSessionPool
 * @property {boolean} persistCookiesPerSession
 * @property {number} pageLoadTimeoutSec
 * @property {number} handlePageTimeoutSecs
 * @property {number} maxRequestRetries
 */

/**
 * Options you can pass to the actor run
 * @typedef Input
 * @property {Apify.RequestOptions[]} [startUrls]
 * @property {string[]} [searchStringsArray]
 * @property {string} [lat]
 * @property {string} [lng]
 * @property {string} [country]
 * @property {string} [state]
 * @property {string} [city]
 * @property {string} [postalCode]
 * @property {number} [zoom]
 * @property {any} [polygon]
 * @property {number} [pageLoadTimeoutSec]
 * @property {boolean} [useChrome]
 * @property {number} [maxConcurrency]
 * @property {number} [maxPagesPerBrowser]
 * @property {number} [maxPageRetries]
 * @property {Apify.ProxyConfigurationOptions} [proxyConfig]
 * @property {boolean} [debug]
 * @property {string} [language]
 * @property {boolean} [useStealth]
 * @property {boolean} [headless]
 * @property {any} [walker]
 * @property {boolean} [includeHistogram]
 * @property {boolean} [includeOpeningHours]
 * @property {boolean} [includePeopleAlsoSearch]
 * @property {number} [maxReviews]
 * @property {number} [maxImages]
 * @property {boolean} [exportPlaceUrls]
 * @property {boolean} [additionalInfo]
 * @property {number} [maxCrawledPlaces]
 * @property {number} [maxAutomaticZoomOut]
 * @property {boolean} [cachePlaces]
 * @property {boolean} [useCachedPlaces]
 * @property {string} [cacheKey]
 * @property {string} [reviewsSort]
 * @property {string} [reviewsTranslation]
 * @property {boolean} scrapeReviewerName
 * @property {boolean} scrapeReviewerId
 * @property {boolean} scrapeReviewerUrl
 * @property {boolean} scrapeReviewId
 * @property {boolean} scrapeReviewUrl
 * @property {boolean} scrapeResponseFromOwnerText
 */

/**
 * Some are maybe null if personal data is disabled
 * @typedef Review
 * @property {string | null} name
 * @property {string} text
 * @property {string} publishAt
 * @property {string} publishedAtDate
 * @property {number} likesCount
 * @property {string | null} reviewId
 * @property {string | null} reviewUrl
 * @property {string | null} reviewerId
 * @property {string | null} reviewerUrl
 * @property {number} reviewerNumberOfReviews
 * @property {boolean} isLocalGuide
 * @property {number | null} stars
 * @property {number | null} rating
 * @property {string | null} responseFromOwnerDate
 * @property {string | null} responseFromOwnerText
 */

/**
 * @typedef PersonalDataOptions
 * @property {boolean} scrapeReviewerName
 * @property {boolean} scrapeReviewerId
 * @property {boolean} scrapeReviewerUrl
 * @property {boolean} scrapeReviewId
 * @property {boolean} scrapeReviewUrl
 * @property {boolean} scrapeResponseFromOwnerText
 */

/**
 * @typedef GeolocationOptions
 * @property {string | undefined} city
 * @property {string | undefined} state
 * @property {string | undefined} country
 * @property {string | undefined} postalCode
 */

/**
 * @typedef {{
 * failed: number,
 * ok: number,
 * outOfPolygon: number,
 * outOfPolygonCached: number,
 * places: number,
 * maps: number,
 * }} InnerStats
 */

/**
 * @typedef {{
 * noOutcomeLoaded?: boolean,
 * isBadQuery?: boolean,
 * hasNoResults?: boolean,
 * isDetailPage?: boolean,
 * isNextPaginationDisabled?: boolean,
 * hasNextPage?: boolean,
 * }} SearchResultOutcome
 */

 

/**
 * @typedef {{
 * lat: number,
 * lng: number,
 * }} Coordinates
 */

/**
 * @typedef {{
 * placeId: string,
 * coords: Coordinates,
 * addressParsed: AddressParsed | undefined,
 * isAdvertisement: boolean,
 * }} PlacePaginationData
 */

/**
 * @typedef {{
 * rank: number,
 * searchPageUrl: string,
 * addressParsed: AddressParsed | undefined,
 * isAdvertisement: boolean
 * }} PlaceUserData
 */

/**
 * @typedef {{
 * neighborhood: string,
 * street: string,
 * city: string,
 * postalCode: string,
 * state: string,
 * countryCode: string,
 * }} AddressParsed
 */

/**
 * @typedef {{
 * url: string,
 * searchPageUrl: string,
 * coordinates: Coordinates,
 * }} PlaceOutOfPolygon
 */

/**
 * @typedef {{
 * keywords: string[],
 * location: Coordinates,
 * }} CachedPlace
 */

/**
 * @typedef {{
 * geojson: {
 *     type: string,
 *     coordinates: number[][]
 * }
 * }} GeoJson
 */

module.exports = {};
