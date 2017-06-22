'use strict';

var logger = require('./../../config/logger');
var assign = require('object-assign');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var os = require('os');
var youtubedl = require('youtube-dl');
var cloudinary = require('./cloudinary');

var DEFAULT_OPTIONS = {
    output: os.tmpdir() + '/thumbnails',
    width: 300
}

exports.getThumbnailAsync = function (itemID, url, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {

        if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output);
        }

        logger.info('Generating thumbnail');

        const output = path.resolve(options.output, itemID + '.jpg');
        const args = ['--skip-download', '--write-thumbnail', '-o' + output];

        youtubedl.exec(url, args, {cwd: options.output}, function (err, stdout) {
            if (err) reject(err);
            logger.info(stdout.join('\n'));
            cloudinary.upload(output, options).then(function (result) {
                resolve(result);
            }).catch(function (err) {
                reject(err);
            });
        });
    });
}