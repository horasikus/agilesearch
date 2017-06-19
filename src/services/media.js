'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var youtubedl = require('youtube-dl');
var os = require('os');
var path = require('path');
var crypto = require('crypto');

exports.getMediaAsync = function (name, url) {

    var tmpFile = path.resolve(os.tmpdir(), crypto.createHash('md5').update(name).digest('hex'));

    return new Promise(function (resolve, reject) {

        var video = youtubedl(url,
            // Optional arguments passed to youtube-dl.
            ['--format=18', '--hls-prefer-ffmpeg'],
            // Additional options can be given for calling `child_process.execFile()`.
            {cwd: __dirname});

        // Will be called when the download starts.
        video.on('info', function (info) {
            logger.info(`Youtube: Downloading ${info._filename} size ${info.size}`);
        });

        // Will be called if download was already completed and there is nothing more to download.
        video.on('complete', function complete(info) {
            logger.info(`Youtube: filename ${info._filename} already downloaded.`);
        });

        // HORACIO_TODO: filename path
        video.pipe(fs.createWriteStream(tmpFile));

        video.on('end', function () {
            logger.info(`Youtube: Downloaded ${tmpFile}`);
            return resolve(tmpFile);
        });

        video.on('error', function error(err) {
            logger.error(err);
            return reject(err);
        });
    });
}