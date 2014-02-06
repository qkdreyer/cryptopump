var express = require('express');
var _ = require('underscore');
var app = express();
var qs = require('qs');
var crypto = require('crypto');
var request = require('request');
 
/**
 * Handle multiple requests at once
 * @param urls [array]
 * @param callback [function]
 * @requires request module for node ( https://github.com/mikeal/request )
 */
var __request = function (urls, callback) {
 
	'use strict';
 
	var results = {}, t = urls.length, c = 0,
		handler = function (error, response, body) {
 
			var url = response.request.uri.href;
 
			results[url] = { error: error, response: response, body: body };
 
			if (++c === urls.length) { callback(results); }
 
		};
 
	while (t--) { request(urls[t], handler); }
};

app.use(express.static(__dirname));

app.get('/', function (req, res) {
    res.send(req.query);
});

var hrTime0 = [];
var api_success_count = 0;
var on_api = function (req, res) {

	var params = req.query;
	var method = params.method;
	var secret = params.secret;
	var key = params.key;
	var id = params.req && params.req.marketid;
	req.count = ++req.count || 0;
	
	if (method === 'getmarkets') hrTime0 = process.hrtime();

	var now = (new Date).getTime();
	var nonce = parseInt(now / 1000, 10);
	var req_extend = _.extend({method: method, nonce: nonce}, params.req);
	var post_data = qs.stringify(req_extend);

	var hash = crypto.createHmac('SHA512', secret);
	hash.update(post_data);
	var sign = hash.digest('hex'); //CryptoJS.HmacSHA512(post_data, secret);
	var headers = {
		'User-Agent': 'Mozilla/4.0 (compatible; Cryptsy API NodeJS Client)',
		'Content-Type': 'application/x-www-form-urlencoded',
		'Sign': sign,
		'Key': key,
		'Connection':'keep-alive'
	};

	var hrTime1 = process.hrtime();
	console.log("(%d), [POST] Request : %s @ %d - Since %ds", hrTime1[0], method, id, hrTime1[0] - hrTime0[0]);

//if (method !== 'getmarkets') return res.send({});
	request.post({
		url: 'https://api.cryptsy.com/api',
		headers: headers,
		body: post_data,
		timeout: 5000
	}, function(e, r, body) {
		if (e) console.log('error!');
		if (e) return on_api(req, res);
		api_success_count++;
		var hrTime2 = process.hrtime();
		console.log("(%d - %d), [POST] --- Response : %s @ %d (Time: %ds, Total: %ds, Count: %d) - Since %ds", hrTime2[0], api_success_count, method, id, hrTime2[0] - hrTime1[0], (hrTime2[0] - hrTime1[0]) * req.count, req.count, hrTime1[0] - hrTime0[0]);
		res.send(body);
	});
};

app.get('/api', on_api);

app.listen(1337);
console.log('Server running at http://127.0.0.1:1337/');