# anode-logging #

Anode logging module and tools

```bash
$ bin/reader --help

  Usage: reader [options]

  Options:

    -h, --help                         output usage information
    -a, --app <string>                 App to query [all]
    -l, --level <error|warn|info|log>  Maximum level to show (error < warn < info < log) [warn]
    -f, --farm <string>                 Farm to filter by [all]
    -i, --instance <string>            ID of the instance to filter by []
    -s, --since <date>                 Query `limit` records since that date [now]
    --message <string>                 Filter by message content (will be very slow) []
    --format <text|html|json>          Output format [text]
    --skip <int>                       Number of entries to skip [0]
    --limit, --top <int>               Number of entries to return [100]
    --no-colors                        Do not color output [false]
```

## reader(options) ##

```
var reader = require('anode-logging').reader;
```

Creates a log reader. Options are:

```js
{
    app: null,        // app filter
    format: 'text',    // output format (text | html | json)
    skip: 0, // number of lines to skip
    top: 10, // number of lines to fetch (limit)
    level: 'warn', // maximum level ('log' < 'info' < 'warn' < 'error')
    farm: null, // farm filter (e.g. 'anodejs')
    instance: null, // instance filter (e.g. 'anodejsrole_IN_0')
    since: null, // time query (find `top` entries since `since`. `null` means now).
    message: null, // regex query on message (very slow, will not work probably)
}
```

The log reader is an `EventEmitter` with the following events:

 * __'line'__ - `function(line, entry)` emitted on each log line.
 * __'error'__ - `function(err)` emitted if there was an error.
 * __'end'__ - `function()` emitted at the end of the log stream.
