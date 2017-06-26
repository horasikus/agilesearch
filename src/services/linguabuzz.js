'use strict';

var assign = require('object-assign');
var Promise = require('bluebird');
var request = require('superagent');
var async = require('async');
var parser = require('xml2json');
var eyes = require('eyes');
var _ = require('underscore');
var logger = require('../../config/logger')

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
    LangIn: '1', // 1:en 2:es 0:not work
    LangOut: '1' // 1:en 2:es 0:not work
}

// http://80.28.211.155/linguabuzz/analizar.aspx?Api_Key=a83992eef8832fc9f96732b8b54996zt&Project=123&Text=la%20funda%20de%20mi%20maravilloso%20iphone%20es%20horrible&Option=XML&Thesaurus=2000
exports.getSyntaxisAsync = function (itemID, data, params, options) {

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
                try {
                    var text = res.text;
                    var match = text.match(/<ETIQUETADO>([^<]*)<\/ETIQUETADO>/);
                    return cb(null, match[1]);
                }
                catch (err) {
                    logger.error(err);
                    return cb(err);
                }
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

        async.mapLimit(data.transcript, options.limitConcurrent, processContent, function (err, results) {
            if (err) {
                logger.error(err);
                return reject(err);
            }

            data.transcript.forEach(function (item, i) {

                logger.info(`Linguabuzz('${item.content}') => ${results[i]}`);

                if (results[i].length) {
                    item.syntaxis = results[i];
                }
            })

            return resolve(data);
        });
    });
}

// http://80.28.211.155/linguabuzz/analizar.aspx?Api_Key=a83992eef8832fc9f96732b8b54996zt&Project=123&Text=Talking connections that will vastly improve most human activities&Option=XML&Thesaurus=573&LangIn=1&LangOut=1
exports.getSemanticsAsync = function (itemID, data, params, options) {

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

                    var json = parser.toJson(res.text, {
                        object: true
                    });

                    const processOpinion = function (opinion) {
                        return _.chain(opinion).omit('VALOR').values().map(function (o) {
                            return _.isObject(o) ? _.chain(o).omit(function (value, key) {
                                return key.charAt(0) === '$';
                            }).values().value() : o;
                        }).flatten().unique().value();
                    }

                    var results = [];
                    if (_.isArray(json.ANALISIS.OPINION)) {
                        _.each(json.ANALISIS.OPINION, function (opinion) {
                            results.push(processOpinion(opinion));
                        })
                    }
                    else {
                        results.push(processOpinion(json.ANALISIS.OPINION));
                    }

                    results = _.chain(results).flatten().unique().value();

                    return cb(null, results);
                }
            )
        ;
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

        async.mapLimit(data.transcript, options.limitConcurrent, processContent, function (err, results) {
            if (err) {
                logger.error(err);
                return reject(err);
            }

            data.metas = data.metas || '';

            data.transcript.forEach(function (item, i) {
                const isValid = function (value) {
                    return value !== 'No se ha encontrado ningún objeto' &&
                        value !== 'restaurante genérico' &&
                        value !== 'Sin Equivalencia' &&
                        value !== 'Experiencia del Cliente' &&
                        value !== 'Experiencia del cliente' && !_.isEmpty(value) && !(new RegExp("\\b" + value.replace(/[^’'0-9a-z ]/gi, '').toLowerCase().replace(' ', '\\b \\b') + "\\b").test(item.content.replace(/[^’'0-9a-z ]/gi, '').toLowerCase()));
                }

                results[i] = _.filter(results[i], isValid);

                logger.info(`Linguabuzz('${item.content}') => ${results[i]}`);

                if (results[i].length) {
                    item.semantics = results[i].join(' ');
                    data.metas = data.metas.concat(' ').concat(item.semantics);
                }
            })

            return resolve(data);
        });
    });
}