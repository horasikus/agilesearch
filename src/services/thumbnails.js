'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var youtubedl = require('youtube-dl');
var path = require('path');
var assign = require('object-assign');

var DEFAULT_OPTIONS = {
    output: 'uploads/thumbnails'
}

exports.getThumbnailAsync = function (url, filename, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {
        const output = path.resolve(options.output, path.basename(filename, path.extname(filename)) + '.jpg');
        logger.info(`Thumbnails: generating thumbnail ${output}`);
        const args = ['--skip-download', '--write-thumbnail', '-o' + output];
        youtubedl.exec(url, args, {cwd: process.cwd()}, function (err, result) {
            if (err) reject(err);
            logger.debug(result);
            resolve(output);
        });
    });
}