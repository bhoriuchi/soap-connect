/**
 * SOAP Connect
 * 
 * @author Branden Horiuchi <bhoriuchi@gmail.com>
 * @license MIT
 * 
 */
var env = {
	lodash  : require('lodash'),
	promise : require('bluebird'),
	request : require('request'),
	xml     : require('xml2json'),
	xmldom  : require('xmldom'),
	events  : require('events'),
	url     : require('url'),
	path    : require('path')
};

env.wsdl = require('./wsdl')(env);

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

module.exports = {
	env: env,
	wsdl: env.wsdl
};