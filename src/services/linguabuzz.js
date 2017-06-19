'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var request = require('superagent');
var async = require('async');

require('superagent-retry')(request);

var DEFAULT_OPTIONS = {
    server: '80.28.211.155',
    service: '/linguabuzz/(S(fqlfxzseli1jhtelycpcthii))/analizar.aspx',
    timeout: 100000,
    retry: 3,
    params: {
        Api_Key: 'a83992eef8832fc9f96732b8b54996zt',
        Project: '123',
        Option: 'XML',
        Thesaurus: '2000',
        LangIn: '1'
    },
    limitConcurrent: 10
}

exports.getLinguaAsync = function (filename, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    if (!fs.existsSync(filename)) {
        return Promise.reject(new Error(`${filename} to linguabuzz not found.`))
    }

    const linguabuzz = function (content, cb) {
        request
            .get('http://' + options.server + options.service)
            .retry(options.retry)
            .query(options.params)
            .query({Text: content})
            .timeout(options.timeout)
            .end(function (err, res) {
                if (err) {
                    return cb(err);
                }
                var text = res.text;
                var match = text.match(/<ETIQUETADO>([^<]*)<\/ETIQUETADO>/);
                return cb(null, match[1]);
            });
    }

    const processContent = function (content, cb) {
        let cleanContent = content.content.replace(/[^’'0-9a-z ]/gi, '');
        cleanContent = cleanContent.replace(/ +/g, ' ');
        linguabuzz(cleanContent, function (err, result) {
            if (!err) return cb(null, result);
            return cb(null, cleanContent);
        });
    }

    return new Promise(function (resolve, reject) {
        logger.info(`Linguabuzz: processing ${filename}`);
        var content = JSON.parse(fs.readFileSync(filename, 'utf8'));
        async.mapLimit(content, options.limitConcurrent, processContent, function (err, results) {
            if (err) {
                reject(err);
            }
            resolve(results);
        });
    });
}