var interceptor = require('../lib/interceptor');

exports.tests = function(test) {
	var target = {
		foo: function() { return 'target.foo'; },
		goo: function() { return 'target.goo'; },
		val1: 123,
		val2: 777,
	};

	var source = {
		foo: function() { return 'source.foo'; },
		zoo: function() { return 'source.zoo'; },
		val1: 456,
		val3: 999,
	};

	// replace 'foo', 'zoo' on target with the ones in source
	interceptor.replace(target, source);
	test.equals(target.foo(), 'source.foo');
	test.equals(target.goo(), 'target.goo');
	test.equals(target.zoo(), 'source.zoo');
	test.equals(target.val1, 456);
	test.equals(target.val2, 777);
	test.equals(target.val3, 999);

	// restore old functions
	interceptor.restore(target);
	test.equals(target.foo(), 'target.foo');
	test.equals(target.goo(), 'target.goo');
	test.ok(!target.zoo);

	// replace twice
	var source2 = {
		goo: function() { return 'source2.goo' },
	};

	interceptor.replace(target, source);
	test.equals(target.foo(), 'source.foo');
	test.equals(target.goo(), 'target.goo');
	test.equals(target.zoo(), 'source.zoo');

	interceptor.replace(target, source2);
	test.equals(target.foo(), 'source.foo');
	test.equals(target.goo(), 'source2.goo');
	test.equals(target.zoo(), 'source.zoo');

	interceptor.restore(target);
	test.equals(target.foo(), 'source.foo');
	test.equals(target.goo(), 'target.goo');
	test.equals(target.zoo(), 'source.zoo');

	test.done();
};