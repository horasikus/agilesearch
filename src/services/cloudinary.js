'use strict';

var logger = require('./../../config/logger');
var assign = require('object-assign');
var Promise = require('bluebird');
var fs = require('fs');
var cloudinary = require('cloudinary');

cloudinary.config({
    cloud_name: 'dgiww3flq',
    api_key: '753851155885459',
    api_secret: 'LFu0JawnHsv4x7YBCW85_ZaoAKs'
});

var DEFAULT_OPTIONS = {};

exports.upload = function (filename, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {

        if (!fs.existsSync(filename)) {
            reject(new Error(`${filename} not found.`))
        }

        logger.info('Uploading to cloudinary');

        cloudinary.uploader.upload(filename, function (result) {
            if (result.error) {
                return reject(result.error.message)
            }
            logger.info(result);
            return resolve(result.url)
        }, options)
    })
}