'use strict';

var logger = require('./../../config/logger');
var assign = require('object-assign');
var Promise = require('bluebird');
var request = require('superagent');
var async = require('async');
var parser = require('xml2json');
var util = require('util');
var eyes = require('eyes');

require('superagent-retry')(request);

var DEFAULT_OPTIONS = {
    server: '80.28.211.155',
    service: '/linguabuzz/analizar.aspx',
    timeout: 100000,
    retry: 3,
    limitConcurrent: 10
}

var DEFAULT_PARAMS = {
    Api_Key: 'a83992eef8832fc9f96732b8b54996zt',
    Project: '123',
    Option: 'XML',
    Thesaurus: '2000', // 2000: syntax
    LangIn: '1' // 1:en 2:es 0:not work
}

// http://80.28.211.155/linguabuzz/analizar.aspx?Api_Key=a83992eef8832fc9f96732b8b54996zt&Project=123&Text=la%20funda%20de%20mi%20maravilloso%20iphone%20es%20horrible&Option=XML&Thesaurus=2000
exports.getSyntaxisAsync = function (itemID, input, params, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    params = assign({}, DEFAULT_PARAMS, params);

    const linguabuzz = function (content, cb) {
        request
            .get('http://' + options.server + options.service)
            .retry(options.retry)
            .query(params)
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

        logger.info('Processing syntaxis with linguabuzz');

        async.mapLimit(input, options.limitConcurrent, processContent, function (err, results) {
            if (err) {
                reject(err);
            }
            logger.info(results);
            resolve(results);
        });
    });
}

// http://80.28.211.155/linguabuzz/analizar.aspx?Api_Key=a83992eef8832fc9f96732b8b54996zt&Project=123&Text=la%20funda%20de%20mi%20maravilloso%20iphone%20es%20horrible&Option=XML&Thesaurus=573&LangIn=1
exports.getSemanticsAsync = function (itemID, input, params, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    params = assign({}, DEFAULT_PARAMS, params);

    const linguabuzz = function (content, cb) {
        request
            .get('http://' + options.server + options.service)
            .retry(options.retry)
            .query(params)
            .query({Text: content})
            .timeout(options.timeout)
            .end(function (err, res) {
                if (err) {
                    return cb(err);
                }
                var xml = res.text;

                var json = parser.toJson(xml);

                return cb(null, json);
            });
    }

    const processContent = function (content, cb) {
        let cleanContent = content.content.replace(/[^’'0-9a-z ]/gi, '');
        cleanContent = cleanContent.replace(/ +/g, ' ');
        linguabuzz(cleanContent, function (err, result) {
            if (!err) return cb(null, result);
            return cb(null, {});
        });
    }


    return new Promise(function (resolve, reject) {

        logger.info('Processing semantics with linguabuzz');

        async.mapLimit(input, options.limitConcurrent, processContent, function (err, results) {
            if (err) {
                reject(err);
            }
            input.forEach(function (item, i) {
                try {
                    item.analisis = JSON.parse(results[i])['ANALISIS'];
                }
                catch (error) {
                    item.analisis = {};
                }
            })

            var inspect = eyes.inspector({maxLength: false});
            inspect(input);
            resolve(input);
        });
    });
}
