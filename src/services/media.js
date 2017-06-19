'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var path = require('path');
var assign = require('object-assign');
var randomstring = require('randomstring');

var DEFAULT_OPTIONS = {
    output: 'uploads/media'
}

exports.getMediaAsync = function (url, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {

        var video = youtubedl(url,
            // Optional arguments passed to youtube-dl.
            ['--format=18', '--hls-prefer-ffmpeg'],
            // Additional options can be given for calling `child_process.execFile()`.
            {cwd: __dirname});

        // Will be called when the download starts.
        video.on('info', function (info) {
            logger.info(`Media: downloading ${info._filename} size ${info.size}`);
        });

        // Will be called if download was already completed and there is nothing more to download.
        video.on('complete', function complete(info) {
            logger.info(`Media: filename ${info._filename} already downloaded.`);
        });

        const output = path.resolve(options.output, randomstring.generate(12) + '.mp4');

        video.pipe(fs.createWriteStream(output));

        video.on('end', function () {
            return resolve(output);
        });

        video.on('error', function error(err) {
            return reject(err);
        });
    });
}