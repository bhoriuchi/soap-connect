var client = require('../lib');
var cred   = require('../credentials');

client.wsdl.parse(cred.wsdl, {ignoreSSL: true}).then(function(data) {
	console.log(JSON.stringify(data, null, '  '));
});