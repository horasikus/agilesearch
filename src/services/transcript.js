'use strict';

var Promise = require('bluebird');
var logger = require('./../../config/logger');
var fs = require('fs');
var path = require('path');
var assign = require('object-assign');
var exec = require('child_process').exec;

var DEFAULT_OPTIONS = {
    output: 'data/transcript',
    format: 'json', // raw|json|vtt|srt
    language: 'en'
}

exports.getTranscriptAsync = function (filename, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    if (!fs.existsSync(filename)) {
        logger.error(`Transcript service: ${filename} not found.`)
        return Promise.reject(new Error(`${filename} not found.`))
    }

    var transcriptDir = path.resolve(process.cwd(), options.output);
    if (!fs.existsSync(transcriptDir)) {
        fs.mkdirSync(transcriptDir);
    }

    return new Promise(function (resolve, reject) {
        logger.info(`Transcript service: transcripting ${filename}`);
        exec(`autosub -o${options.output} -F${options.format} -S${options.language} -D${options.language} ${filename}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            resolve('done');
        });
    });
}