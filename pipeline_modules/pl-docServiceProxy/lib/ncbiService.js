var log = require('pl-log');
var request = require('request');
var queryString = require('querystring');
var constants = require('pl-constants');
var config = require("pl-config");

var ncbiService = (function () {
    "use strict";
    
    var host = 'http://eutils.ncbi.nlm.nih.gov/';
    var path = 'entrez/eutils/';
    var services = {
        search: 'esearch.fcgi',
        fetch: 'efetch.fcgi'
    };
    
    var dbs = {
        pmc: 'pmc',
        pubmed: 'pubmed'
    };
    
    var dbMap = {};
    dbMap[dbs.pmc] = constants.sources.PMC,
    dbMap[dbs.pubmed] = constants.sources.PUBMED;
    
    function getDBId(dbName) {
        return dbMap[dbName];
    }
    
    var etypes = {
        edat: 'edat'
    };
    var _cache = undefined;
    
    var searchRequest = function (database, terms, retmax, retStart, etype, reldate, callback) {
        var query = {
            db: database,
            term: terms.join(' '),
            retmax: retmax,
            retStart: retStart,
            reldate: reldate,
            usehistory: 'y',
            retmode: 'json'
        };
        if (reldate === -1) {
            delete query.reldate;
        }
        
        var urlRequest = host + path + services.search + '?' + queryString.stringify(query);
        console.log(urlRequest);

        var opts = {
          url: urlRequest,
          timeout: config.http.timeoutMsec
        };

      return request(opts, function(err, resp, body) {
            if (err) {
                return callback(err);
            }
            
            try {
                body = JSON.parse(body);
            } catch (e) {
                return callback(e);
            }
            
            _cache = {
                database: database,
                query: body.esearchresult.querykey,
                WebEnv: body.esearchresult.webenv,
                terms: terms.join(' ')
            };

            return callback(null, body.esearchresult, _cache);
        });
    };
    
    var configCache = function (database, query, webenv, terms) {
        _cache = {
            database: database,
            query: query,
            WebEnv: webenv,
            terms: terms
        };
    };
    
    var getCache = function () {
        return _cache;
    };
    
    var fetchCachedContent = function (start, max, lastCache, callback) {
        if (!lastCache) {
            return callback({ error: 'no query made' });
        }
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


        var opts = {
          url: urlRequest,
          timeout: config.http.timeoutMsec
        };

      request(urlRequest, function(err, resp, body) {
            if (err) {
                return callback(err);
            }
            if (body.length < 1000) {
                return callback({ error: body });
            }
            callback(null, body);
        });
    };
    
    var fetchContent = function (database, id, callback) {
        var query = {
            db: database,
            id: id,
            rettype: 'xml'
        };
        var urlRequest = host + path + services.fetch + '?' + queryString.stringify(query);

        var opts = {
          url: urlRequest,
          timeout: config.http.timeoutMsec
        };

        console.info(urlRequest);
        request(opts, function(err, resp, body) {
            if (err) {
                return callback(err);
            }
            return callback(err, body);
        });
    };

    return {
        searchRequest: searchRequest,
        fetchContent: fetchContent,
        fetchCachedContent: fetchCachedContent,
        configCache: configCache,
        getCache: getCache,
        getDBId: getDBId,
        dbs: dbs,
        etypes: etypes
    };
}());

module.exports = ncbiService;