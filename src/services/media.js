'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var path = require('path');
var crypto = require('crypto');

var DEFAULT_OPTIONS = {
    output: 'data/media'
}

exports.getMediaAsync = function (name, url) {

    var mediaDir = path.resolve(process.cwd(), DEFAULT_OPTIONS.output);

    if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir);
    }

    var mediaFile = path.resolve(mediaDir, crypto.createHash('md5').update(name).digest('hex'));

    return new Promise(function (resolve, reject) {

        var video = youtubedl(url,
            // Optional arguments passed to youtube-dl.
            ['--format=18', '--hls-prefer-ffmpeg'],
            // Additional options can be given for calling `child_process.execFile()`.
            {cwd: __dirname});

        // Will be called when the download starts.
        video.on('info', function (info) {
            logger.info(`Media service: downloading ${info._filename} size ${info.size}`);
        });

        // Will be called if download was already completed and there is nothing more to download.
        video.on('complete', function complete(info) {
            logger.info(`Media service: filename ${info._filename} already downloaded.`);
        });

        // HORACIO_TODO: filename path
        video.pipe(fs.createWriteStream(mediaFile));

        video.on('end', function () {
            logger.info(`Media service: Downloaded ${mediaFile}`);
            return resolve(mediaFile);
        });

        video.on('error', function error(err) {
            logger.error(err);
            return reject(err);
        });
    });
}