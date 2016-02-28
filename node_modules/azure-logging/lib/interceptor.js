/**
 * Replaces each function `target.xxx` with `source.xxx`.
 */
exports.replace = function(target, source) {
	if (!target.$old) target.$old = [];

	var old = {};
	for (var k in source) {
		if (k in target) old[k] = target[k];
		else old[k] = undefined;
		target[k] = source[k];
	}

	// push old functions into stack
	target.$old.push(old);
};

/**
 * Restores old functions from target
 */
exports.restore = function(target) {
	if (!target) return null;
	if (!target.$old) return target; // no interception

	var last = target.$old.pop();
	for (var k in last) {
		target[k] = last[k];
		if (target[k] === undefined) delete target[k];
	}

	return target;
};