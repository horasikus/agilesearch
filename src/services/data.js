'use strict';

var Promise = require('bluebird');
var elastic = Promise.promisifyAll(require('../elastic/data'));
var collectionService = require('../services/collection');
var slugs = require('../libs/slugs');
var async = require('async');
var _ = require('lodash');
var dataHelper = require('../helpers/data');
var collectionHelper = require('../helpers/collection');

var mediaService = require('./media');
var transcriptMediaService = require('./transcript');
var linguabuzzService = require('./linguabuzz');
var thumbnailsService = require('./thumbnails');
var randomstring = require('randomstring');

exports.processItemAsync = function (mediaURL, language) {
    return new Promise(function (resolve, reject) {
        const itemID = randomstring.generate(12);
        const data = {};

        async.waterfall([
            downloadMedia,
            getThumbnail,
            getDescription,
            getSubtitles,
            processSyntaxis,
            processSemantics,
        ], function (err, result) {
            if (err) return reject(err);
            return resolve(result);
        });

        function downloadMedia(cb) {
            mediaService.getMediaAsync(itemID, mediaURL).then(function (result) {
                data.tmpFile = result.tmpFile;
                data.mediaURL = result.mediaURL;
                cb(null, data);
            }).catch(function (err) {
                cb(err);
            })
        }

        function getThumbnail(data, cb) {
            thumbnailsService.getThumbnailAsync(itemID, mediaURL).then(function (result) {
                data.image = result;
                cb(null, data);
            }).catch(function (err) {
                cb(err);
            })
        }

        function getDescription(data, cb) {
            transcriptMediaService.getTranscriptAsync(itemID, data.tmpFile, {
                language: language,
                format: 'raw'
            }).then(function (result) {
                data.description = result;
                cb(null, data);
            }).catch(function (err) {
                cb(err);
            })
        }

        function getSubtitles(data, cb) {
            transcriptMediaService.getTranscriptAsync(itemID, data.tmpFile, {
                language: language
            }).then(function (result) {
                data.transcript = result;
                cb(null, data);
            }).catch(function (err) {
                cb(err);
            })
        }

        function processSyntaxis(data, cb) {
            if (language !== 'en') { // only works 'en'
                cb(null, data);
            }
            else {
                linguabuzzService.getSyntaxisAsync(itemID, data, {
                    Thesaurus: '2000',
                    LangIn: '1',
                    LangOut: '1'
                }).then(function (data) {
                    cb(null, data);
                }).catch(function (err) {
                    cb(err);
                })
            }
        }

        function processSemantics(data, cb) {
            linguabuzzService.getSemanticsAsync(itemID, data, {
                Thesaurus: '573',
                LangIn: language === 'en' ? '7' : '2',
                LangOut: language === 'en' ? '7' : '2'
            }).then(function (data) {
                cb(null, data);
            }).catch(function (err) {
                cb(err);
            })
        }
    })
};


/**
 * get document
 */
exports.addDocumentAsync = function (data) {
    return exports.processItemAsync(data.body.videoURL, data.body.language).then(function (result) {
        data.body.mediaURL = result.mediaURL;
        data.body.image = result.image;
        data.body.transcript = result.transcript;
        data.body.description = result.description;
        data.body.metas = result.metas;

        collectionService.findCollectionAsync({
                name: data.collectionName,
                project: data.projectName
            })
            .then(function (collection) {
                var helper = collectionHelper(collection);

                return slugs.setSlugsAsync(
                    helper.getName(),
                    helper.getSlugs(),
                    dataHelper.inputMapper(data.body, collection)
                ).then(function (res) {
                    return elastic.addDocumentAsync({
                        index: helper.getIndex(),
                        type: helper.getType(),
                        refresh: data.refresh,
                        body: dataHelper.inputMapper(data.body, collection),
                        id: data.body.id
                    })
                })

            }).then(function (res) {
            return {
                id: res._id,
                collection: res._type,
                project: res._index
            }
        })
    }).catch(function (err) {
        console.log(err);
    })
}

/**
 * update document
 */
exports.updateDocumentAsync = function (data) {
    return collectionService.findCollectionAsync({
            name: data.collectionName,
            project: data.projectName
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);
            return slugs.setSlugsAsync(
                helper.getName(),
                helper.getSlugs(),
                dataHelper.inputMapper(data.body, collection)
            ).then(function (res) {

                // dirty hack
                // should be enabled should be ignored as additional configuratoin
                // i.e. ignoredFields object
                /*var temp = _.clone(collection);
                 if (temp.extraSchema && temp.extraSchema.enabled) {
                 delete temp.extraSchema.enabled;
                 }*/

                return elastic.updateDocumentAsync({
                    index: helper.getIndex(),
                    type: helper.getType(),
                    //body: data.body,
                    refresh: data.refresh,
                    body: dataHelper.inputMapper(data.body, collection, {
                        check_fields: ['array']
                    }),
                    id: data.id
                })
            })
        }).then(function (res) {
            return res;
        })
}

/**
 * clean documents
 */
exports.cleanDocumentsAsync = function (data) {
    return collectionService.findCollectionAsync({
            name: data.collectionName,
            project: data.projectName
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);
            return elastic.cleanDocumentsAsync({
                index: helper.getIndex(),
                type: helper.getType()
            });
        })
}

/**
 * delete document
 */
exports.deleteDocumentAsync = function (data) {
    return collectionService.findCollectionAsync({
            name: data.collectionName,
            project: data.projectName
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);
            return elastic.deleteDocumentAsync({
                index: helper.getIndex(),
                type: helper.getType(),
                id: data.id
            })
        })
}

/**
 * enable / disable item / document
 */
exports.enableDocumentAsync = function (data) {
    if (!data.id) {
        throw new Error('item id is missing')
    }
    return collectionService.findCollectionAsync({
            name: data.name
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);
            return elastic.updateDocumentAsync({
                index: helper.getIndex(),
                type: helper.getType(),
                refresh: data.refresh,
                body: {
                    enabled: data.enabled
                },
                id: data.id
            })
        })
        .then(function (res) {
            return res;
        })
}

/**
 * get document
 */
exports.getDocumentAsync = function (data) {
    return collectionService.findCollectionAsync({
            name: data.collectionName,
            project: data.projectName
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);
            return elastic.getDocumentAsync({
                index: helper.getIndex(),
                type: helper.getType(),
                id: data.id
            })
        })
        .then(function (res) {
            var output = res._source;
            //console.log(res);
            //console.log(output);
            if (output.body) {
                output.body.id = res._id;
            }
            return res._source;
        })
}

/**
 * add multiple documents elastic
 * @param {Array} data documents
 * @param {String} projectName
 * @param {String} collectionName
 */
exports.addDocumentsAsync = function (data) {
    return collectionService.findCollectionAsync({
            name: data.collectionName,
            project: data.projectName
        })
        .then(function (collection) {
            var helper = collectionHelper(collection);

            // adding slugs mapping to key value datastore
            return slugs.setSlugsAsync(
                helper.getName(),
                helper.getSlugs(),
                dataHelper.inputMapper(data.body, collection)
            ).then(function (res) {
                return elastic.addDocumentsAsync({
                    index: helper.getIndex(),
                    type: helper.getType(),
                    refresh: data.refresh,
                    body: dataHelper.inputMapper(data.body, collection),
                })
            })
        }).then(function (res) {
            return _.pick(_.extend(res, {
                ids: _.map(res.items, function (val) {
                    return val.create._id;
                }),
                //project: project,
                collection: data.collectionName
            }), 'took', 'errors', 'ids', 'collection');
        })
}

/**
 * add all documents to elastic
 * @param {Array} documents full data
 * @param {String} projectName
 * @param {String} collectionName
 * @param {Integer} batchSize
 * @return {String} inserted documents count
 */
exports.addAllDocuments = function (data, callback) {

    var documents = data.body;
    var limit = documents.length;
    var length = documents.length;

    var batchSize = data.batchSize || 1000;

    var count = 0;

    // needs to be refactored
    var projectName = data.projectName;
    var collectionName = data.collectionName;

    async.whilst(
        function () {
            return length > 0;
        },
        function (callback) {

            var removed = documents.splice(0, batchSize);
            exports.addDocumentsAsync({
                // needs to be refactored
                projectName: projectName,
                collectionName: collectionName,
                refresh: data.refresh,
                body: removed
            }).then(function (res) {
                return callback(null, res);
            }).catch(function (err) {
                return callback(err);
            })
            length -= removed.length;
        },
        function (err, res) {
            if (err) {
                console.log(err);
            }
            callback(null, limit + ' documents added');
        }
    );
}
