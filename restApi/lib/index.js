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
 * Handler functions
 */

var AWS = require('aws-sdk');
var s3 = new AWS.S3();
var async = require('async');
var h = require('Handlebars');
var fs = require('fs');
var path = require('path');
var helpers = require('./helpers');

// NAIP - Serves landing page
module.exports.naipRoot = function (event, cb) {
  // Register partials with Handlebars
  h.registerPartial('footer', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'footer.html'), 'utf8')));
  h.registerPartial('header', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.html'), 'utf8')));
  h.registerPartial('nav', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'nav.html'), 'utf8')));

  // Render template with Handlebars
  var source = fs.readFileSync(path.join(__dirname, '..', 'views', 'index.html'), 'utf8');
  var template = h.compile(source);
  var context = {basePath: helpers.getBasePath(process.env.SERVERLESS_STAGE), staticURL: process.env.STATIC_URL};
  return cb(null, template(context));
};

// NAIP - States page
module.exports.naipStates = function (event, cb) {
  // Get bucket name from STATIC_URL
  var params = {
    Bucket: helpers.getStaticBucket(),
    Key: 'uniques.json'
  };
  s3.getObject(params, function (err, data) {
    var json = JSON.parse(data.Body.toString('utf8'));
    // var states = Object.keys(json);
    var states = [];
    for (var i = 0; i < Object.keys(json).length; i++) {
      var o = {
        state: Object.keys(json)[i],
        years: Object.keys(json[Object.keys(json)[i]])
      };
      states.push(o);
    }

    // Register partials with Handlebars
    h.registerPartial('footer', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'footer.html'), 'utf8')));
    h.registerPartial('header', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.html'), 'utf8')));
    h.registerPartial('nav', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'nav.html'), 'utf8')));

    // Render template with Handlebars
    var source = fs.readFileSync(path.join(__dirname, '..', 'views', 'states.html'), 'utf8');
    var template = h.compile(source);
    var context = {states: states, basePath: helpers.getBasePath(process.env.SERVERLESS_STAGE), staticURL: process.env.STATIC_URL};
    return cb(err, template(context));
  });
};

// NAIP - Quads page
module.exports.naipQuads = function (event, cb) {
  // Get bucket name from STATIC_URL
  var params = {
    Bucket: helpers.getStaticBucket(),
    Key: 'uniques.json'
  };
  s3.getObject(params, function (err, data) {
    var json = JSON.parse(data.Body.toString('utf8'));
    var quads = json[event.state][event.year];

    // Set title here to get around templating issues
    var title = 'NAIP on AWS - Quads Available for ' + event.state + ' in ' + event.years;

    // Register partials with Handlebars
    h.registerPartial('footer', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'footer.html'), 'utf8')));
    h.registerPartial('header', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.html'), 'utf8')));
    h.registerPartial('nav', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'nav.html'), 'utf8')));

    // Render template with Handlebars
    var source = fs.readFileSync(path.join(__dirname, '..', 'views', 'quads.html'), 'utf8');
    var template = h.compile(source);
    var context = {title: title, quads: quads, state: event.state, year: event.year, basePath: helpers.getBasePath(process.env.SERVERLESS_STAGE), staticURL: process.env.STATIC_URL};
    return cb(err, template(context));
  });
};

// NAIP - Single quad page
module.exports.naipQuad = function (event, cb) {
  var tasks = {
    files: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/rgb/100pct/' + event.quad + '/'
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return path.basename(d.Key, '.tif');
        });
        return done(err, data);
      });
    }
  };
  async.parallel(tasks, function (err, results) {
    // Register partials with Handlebars
    h.registerPartial('footer', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'footer.html'), 'utf8')));
    h.registerPartial('header', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.html'), 'utf8')));
    h.registerPartial('nav', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'nav.html'), 'utf8')));

    // Set title here to get around templating issues
    var title = 'NAIP on AWS - ' + event.quad;

    // Render template with Handlebars
    var source = fs.readFileSync(path.join(__dirname, '..', 'views', 'quad.html'), 'utf8');
    var template = h.compile(source);
    results.basePath = process.env.BASE_PATH;
    results.staticURL = process.env.STATIC_URL;
    var context = {state: event.state, year: event.year, quad: event.quad, files: results.files, title: title, basePath: helpers.getBasePath(process.env.SERVERLESS_STAGE), staticURL: process.env.STATIC_URL};
    return cb(err, template(context));
  });
};

// NAIP - Single scene page
module.exports.naipScene = function (event, cb) {
  var tasks = {
    overviews100: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/rgb/100pct/' + event.quad + '/' + event.scene
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return {key: d.Key, filename: '100pct/' + path.basename(d.Key)};
        });
        return done(err, data);
      });
    },
    overviews50: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/rgb/50pct/' + event.quad + '/' + event.scene
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return {key: d.Key, filename: '50pct/' + path.basename(d.Key)};
        });
        return done(err, data);
      });
    },
    tiffs: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/rgbir/' + event.quad + '/' + event.scene
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return {key: d.Key, filename: path.basename(d.Key)};
        });
        return done(err, data);
      });
    },
    shapefiles: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/shpfl/'
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return {key: d.Key, filename: path.basename(d.Key)};
        });
        return done(err, data);
      });
    },
    metadata: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Prefix: event.state + '/' + event.year + '/1m/fgdc/' + event.quad + '/' + event.scene
      };
      s3.listObjects(params, function (err, data) {
        data = data.Contents.map(function (d) {
          return {key: d.Key, filename: path.basename(d.Key)};
        });
        return done(err, data);
      });
    }
  };
  async.parallel(tasks, function (err, results) {
    var scene = {
      id: event.scene,
      files: {}
    };

    // Register partials with Handlebars
    h.registerPartial('footer', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'footer.html'), 'utf8')));
    h.registerPartial('header', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'header.html'), 'utf8')));
    h.registerPartial('nav', (fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'nav.html'), 'utf8')));

    // Set title here to get around templating issues
    var title = 'NAIP on AWS - ' + event.quad;

    // Bin files into specific groups
    scene.files.tiffs = results.tiffs;
    scene.files.shapefiles = results.shapefiles;
    scene.files.overviews = results.overviews50.concat(results.overviews100);
    scene.files.metadata = results.metadata;
    console.log(scene);
    // Render template with Handlebars
    var source = fs.readFileSync(path.join(__dirname, '..', 'views', 'scene.html'), 'utf8');
    var template = h.compile(source);
    results.basePath = process.env.BASE_PATH;
    results.staticURL = process.env.STATIC_URL;
    var context = {state: event.state, year: event.year, quad: event.quad, scene: scene, title: title, basePath: helpers.getBasePath(process.env.SERVERLESS_STAGE), staticURL: process.env.STATIC_URL};
    return cb(err, template(context));
  });
};

// NAIP - provide signed url
module.exports.getSignedURL = function (event, cb) {
  var tasks = {
    url: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Key: event.key,
        Expires: 10
      };
      s3.getSignedUrl('getObject', params, function (err, url) {
        return done(err, url);
      });
    },
    metadata: function (done) {
      var params = {
        Bucket: 'aws-naip',
        Key: event.key
      };
      s3.headObject(params, function (err, data) {
        return done(err, data);
      });
    }
  };
  async.parallel(tasks, function (err, results) {
    // Can now access size of object with results.metadata.ContentLength
    return cb(err, {url: results.url});
  });
};
