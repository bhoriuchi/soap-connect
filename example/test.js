var client = require('../lib');
var util   = require('util');
var _ = require('lodash');
var fs = require('fs');
var cred = require('../credentials');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

client.wsdl(cred.wsdl, {cache: true}).then(function(wsdl) {
	fs.writeFileSync('out.txt', JSON.stringify(wsdl._meta, null, '  '));

	var port = wsdl.vim25Service.VimService.VimPort;
	
	//console.log(_.keys(port).sort());
	port.RetrieveServiceContent({
		_this: 'ServiceInstance'
	});
	
	/*
	console.log(JSON.stringify(wsdl.vim25.KeyAnyValue(), null, '  '));
	console.log(JSON.stringify(wsdl.vim25.KeyAnyValue({
		dynamicProperty: {
			val: '100',
			//name: 'hi'
		},
		dynamicType: 1,
		key: 'imakey',
		value: 100
	}), null, '  '));
	 */
});