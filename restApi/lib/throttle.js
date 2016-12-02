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
var apigateway = new AWS.APIGateway();

var baseRate = 1000; // Base level requests / second
var baseBurst = 2000; // Base level of burst
var throttledRate = 2;  // Throttled level requests / second
var throttledBurst = 4;  // Throttled level of burst

module.exports.reset = function (event, cb) {
  console.info('Resetting throttle limits to default.');
  setThrottleLimits(baseRate, baseBurst, function (err, response) {
    return cb(err, response);
  });
};

module.exports.limit = function (event, cb) {
  console.info('Throttling down API.');
  setThrottleLimits(throttledRate, throttledBurst, function (err) {
    return cb(err, 'done');
  });
};

var setThrottleLimits = function (rate, burst, cb) {
  var params = {
    restApiId: process.env.API_GATEWAY_ID,
    stageName: process.env.SERVERLESS_STAGE,
    patchOperations: [
      {
        op: 'replace',
        path: '/d/GET/throttling/rateLimit',
        value: rate.toString()
      },
      {
        op: 'replace',
        path: '/d/GET/throttling/burstLimit',
        value: burst.toString()
      }
    ]
  };
  apigateway.updateStage(params, function (err, data) {
    return cb(err);
  });
};
