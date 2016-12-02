/**
 * Copyright 2016 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in
 * compliance with the License. A copy of the License is located at
 *
 * http://aws.amazon.com/apache2.0/
 *
 * or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/**
 * Functions related to updating of site metadata.
 */

'use strict';

var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var fs = require('fs');
var parse = require('csv-parse');
var async = require('async');
var helpers = require('./helpers');
var _ = require('lodash');

var filesList = '/tmp/manifest.txt'; // Where to store list of all NAIP scenes
var uniquesFile = 'uniques.json';  // Filename for combos

module.exports.update = function (event, cb) {
  // Download data from S3
  console.info('Getting latest manifest from S3!');
  var params = {
    Bucket: 'aws-naip',
    Key: 'manifest.txt',
    RequestPayer: 'requester'
  };
  s3.getObject(params, function (err, data) {
    if (err) {
      return cb(err);
    }
    console.info('Saving manifest to disk.');
    fs.writeFileSync(filesList, data.Body.toString());
    processData(function (err, results) {
      return cb(err, results);
    });
  });
};

var processData = function (cb) {
  console.info('Reading in scenes data from ' + filesList);
  var input = fs.createReadStream(filesList);
  var parser = parse();
  input.pipe(parser);
  var obj = {};
  parser.on('data', function (data) {
    // This is dataset specific, turn into an object we can work with
    var file = data[0];
    var parts = _.initial(file.split('/'));
    if (parts.indexOf('rgb') !== -1 && parts.indexOf('100pct') !== -1) {
      obj[parts[0]] = obj[parts[0]] || {};
      obj[parts[0]][parts[1]] = obj[parts[0]][parts[1]] || [];
      if (obj[parts[0]][parts[1]].indexOf(parts[5]) === -1) {
        obj[parts[0]][parts[1]].push(parts[5]);
      }
    }
  });

  parser.on('finish', function () {
    console.info('Built up unique manifest object internally, writing out files to S3.');
    var tasks = [
      function (done) {
        writeUniques(obj, done);
      }
    ];
    async.parallel(tasks, function (err, results) {
      if (err) {
        return cb(err);
      }
      console.info('All done!');
      return cb(null, 'done');
    });
  });

  var writeUniques = function (data, cb) {
    console.info('Writing uniques ' + uniquesFile);
    writeToS3(uniquesFile, JSON.stringify(data), function (err) {
      console.info('Wrote unique combos to ' + uniquesFile);
      return cb(err);
    });
  };
};

var writeToS3 = function (key, data, cb) {
  s3.putObject({
    'Bucket': helpers.getStaticBucket(),
    'Key': key,
    'Body': data,
    'ACL': 'public-read'
  }, function (err) {
    return cb(err);
  });
};
