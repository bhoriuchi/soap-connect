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
	events  : require('events')
};

env.wsdl = require('./wsdl')(env);

module.exports = {
	env: env,
	wsdl: env.wsdl
};