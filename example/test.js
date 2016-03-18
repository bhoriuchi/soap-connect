var client = require('../lib');
var util   = require('util');
var _ = require('lodash');
var fs = require('fs');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

client.wsdl('https://vcenter01/sdk/vimService.wsdl', {cache: true}).then(function(wsdl) {
	//fs.writeFileSync('out.txt', JSON.stringify(wsdl._meta, null, '  '));
	//console.log(wsdl._meta.schema['http://www.w3.org/2001/XMLSchema']);
	console.log(JSON.stringify(wsdl.vim25.DynamicProperty(), null, '  '));

});