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
    output: os.tmpdir() + '/media',
    resource_type: 'video'
}

exports.getMediaAsync = function (itemID, url, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {

        if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output);
        }

        const filename = path.resolve(options.output, itemID);

        var video = youtubedl(url,
            // Optional arguments passed to youtube-dl.
            ['--format=18', '--hls-prefer-ffmpeg'],
            // Additional options can be given for calling `child_process.execFile()`.
            {cwd: options.output});

        // Will be called when the download starts.
        video.on('info', function (info) {
            logger.info(`Downloading ${info._filename} size ${info.size}`);
        });

        video.pipe(fs.createWriteStream(filename));

        video.on('end', function () {
            cloudinary.upload(filename, options).then(function (result) {
                resolve({
                    tmpFile: filename,
                    mediaURL: result
                });
            }).catch(function (err) {
                reject(err);
            });
        });

        video.on('error', function error(err) {
            return reject(err);
        });
    });
}