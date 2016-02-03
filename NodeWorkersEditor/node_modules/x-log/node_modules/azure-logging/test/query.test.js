var db = require('../lib/db');

exports.normal = function(test) {
	var count = 0;

	var q = db.query();

	q.on('item', function(item) {
		count++;
	});

	q.on('error', function(err) {
		console.error('error:', err);
	});

	q.on('end', function() {
		test.equals(count, 10);
		test.done();
	});
};

exports.limit2 = function(test) {
	var count = 0;

	var q = db.query({ }, { limit: 2 });

	q.on('item', function(item) {
		count++;
	});

	q.on('error', function(err) {
		console.error('error:', err);
	});

	q.on('end', function() {
		test.equals(count, 2);
		test.done();
	});
}


