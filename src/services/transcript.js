'use strict';

var logger = require('./../../config/logger');
var assign = require('object-assign');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var os = require('os');
var exec = require('child_process').exec;

var DEFAULT_OPTIONS = {
    output: os.tmpdir() + '/subtitles',
    format: 'json', // raw|json|vtt|srt
    language: 'es'
}

exports.getTranscriptAsync = function (itemID, input, options) {

    options = assign({}, DEFAULT_OPTIONS, options);

    return new Promise(function (resolve, reject) {

        if (!fs.existsSync(input)) {
            reject(new Error(`${input} not found.`))
        }

        if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output);
        }

        logger.info('Auto generating subtitles ' + options.format);

        const output = path.resolve(options.output, itemID + '.' + options.format);

        exec(`autosub -o${output} -F${options.format} -S${options.language} -D${options.language} ${input}`, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            }
            var content;
            if (options.format === 'json') {
                content = JSON.parse(fs.readFileSync(output, 'utf8'));
            }
            else {
                content = fs.readFileSync(output, 'utf8');
            }
            logger.info(content);
            resolve(content);
        });
    });
}