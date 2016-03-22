/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var env = {
	lodash       : require('lodash'),
	promise      : require('bluebird'),
	request      : require('request'),
	xmldom       : require('xmldom'),
	events       : require('events'),
	url          : require('url'),
	path         : require('path'),
	localStorage : require('node-localstorage')
};

env.utils = require('./utils')(env);
env.wsdl = require('./wsdl')(env);
env.client = require('./client')(env);


module.exports = {
	env: env,
	wsdl: env.wsdl,
	client: env.client
};