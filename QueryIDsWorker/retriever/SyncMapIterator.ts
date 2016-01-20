/**
 * Creates a new Sync MapIterator over objects with an asyncrhonus mapFunction
 * @param {[array]}   objects          [object array to iterate over]
 * @param {[Function]}   mapFunction [function to apply over each object sync mode]
 * @param {Function} done             [function to call when it's done]
 */
export default class SyncMapIterator {

    objects: any;
    i: number = 0;
    retries: number = 0;
    mapFunction: any;
    done: any;

    constructor(objects, mapFunction, done) {
        this.objects = objects;
        this.mapFunction = mapFunction;
        this.done = done;
    }

    next = function(params) {
        var self = this;
        params = params || {};
        if (this.i >= this.objects.length) {
            return this.done(params);
        }
        this.mapFunction(this.objects[this.i], params, (newParams) => {
            this.i++;
            this.next(newParams);
        });
    }

    hasNext = function (): boolean {
        return this.i < this.objects.length;
    }

    retry = function (params): void {
        this.i--;
        this.retries++;
        params = params || {};
        this.next(params);
    }
}