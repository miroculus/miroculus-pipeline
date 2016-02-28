var reader = require('..').reader;

exports.test = function(test) {

	var opts = {
		domain: 'anodejs.cloudapp.net',
		top: 30,
	};

	var r = reader(opts);

	var count = 0;

	r.on('line', function(line, item) {
		process.stdout.write(line);
		test.equals(item.meta.domain, opts.domain);
		test.ok(line);
		test.ok(item);
		count++;
	});

	r.on('end', function() {  
		test.equals(count, opts.top);
		test.done();
	});
}

