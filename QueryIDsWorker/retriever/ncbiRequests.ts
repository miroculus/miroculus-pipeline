import request = require('request');
import queryString = require('querystring');

var host = 'http://eutils.ncbi.nlm.nih.gov/';
var path = 'entrez/eutils/';

var services = {
    search: 'esearch.fcgi',
    fetch: 'efetch.fcgi'
};

interface IConfig {
    database: string;
    query: string;
    WebEnv: string;
    terms: string;
}

var cache: IConfig = undefined;

export function searchRequest(database, terms, retmax, retStart, etype, reldate, callback) {
    var query = {
        db: database,
        term: terms.join(' '),
        retmax: retmax,
        retStart: retStart,
        reldate: reldate,
        usehistory: 'y',
        retmode: 'json'
    };
    if (reldate == -1) {
        delete query.reldate;
    }

    var urlRequest = host + path + services.search + '?' + queryString.stringify(query);
    console.log(urlRequest);
    request(urlRequest, function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        body = JSON.parse(body);
        cache = {
            database: database,
            query: body.esearchresult.querykey,
            WebEnv: body.esearchresult.webenv,
            terms: terms.join(' ')
        }
        callback(null, body.esearchresult, cache);
    });
};

export function configCache(database, query, webenv, terms) {
    cache = {
        database: database,
        query: query,
        WebEnv: webenv,
        terms: terms
    }
};

var getCache = function () {
    return cache;
}


export function fetchCachedContent(start, max, lastCache, callback) {
    if (!lastCache) return callback({ error: 'no query made' });
    var query = {
        db: lastCache.database,
        term: lastCache.terms,
        retmax: max,
        retstart: start,
        rettype: 'medline',
        WebEnv: lastCache.WebEnv,
        query_key: lastCache.query
    };

    var urlRequest = host + path + services.fetch + '?' + queryString.stringify(query);
    request(urlRequest, function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        if (body.length < 1000) {
            return callback({ error: body });
        }

        callback(null, body);
    });
};


export function fetchContent(database, id, callback) {
    var query = {
        db: database,
        id: id,
        rettype: 'xml'
    };

    var urlRequest = host + path + services.fetch + '?' + queryString.stringify(query);
    request(urlRequest, function (err, resp, body) {
        if (err) {
            return callback(err);
        }
        return callback(err, body);
    });
};
