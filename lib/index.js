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

env.wsdl = require('./wsdl')(env);



module.exports = {
	env: env,
	wsdl: env.wsdl
};