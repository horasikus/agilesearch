'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var exec = require('child_process').exec;
var os = require('os');

var DEFAULT_OPTIONS = {
    format: 'json', // raw|json|vtt|srt
    language: 'es'
}

exports.getTranscriptAsync = function (filename, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    if (!fs.existsSync(filename)) {
        return Promise.reject(new Error(`${filename} to transcript not found.`))
    }

    return new Promise(function (resolve, reject) {
        logger.info(`Transcript: processing ${filename}`);
        const output = path.resolve(os.tmpdir(), path.basename(filename, path.extname(filename))) + '.' + options.format;
        exec(`autosub -o${output} -F${options.format} -S${options.language} -D${options.language} ${filename}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            resolve(output);
        });
    });
}