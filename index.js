var spawn = require('child_process').spawn,
    split = require('split'),
    EventEmiter = require('events').EventEmitter

function FFmpeg_Live(options) {

  var self = {};
  self.options = options || {};
  self.properties = {};

  self.proc = new EventEmiter();

  // Bind `on` events to the eventEmiter, so instead of:
  //   ffmpeg.proc.on(event);
  // you can write:
  //   ffmpeg.on(event);
  self.on = self.proc.on.bind(self.proc);

  self._processOptions = function(options) {
    var processed_options = [];


    for (var key in self.options) {
        processed_options.push(key);
        var val = self.options[key]
        if (val !== null && typeof val !== 'undefined') {
            processed_options.push(val);
        }
    }

  }

  self.start = function(callback) {
        /*var proc = spawn('ffmpeg', self._processOptions(self.options));

        // `self.proc` is the exposed EventEmitter, so we need to pass
        // events and data from the actual process to it.
        var default_events = ['data', 'error', 'exit', 'close', 'disconnect'];
        default_events.forEach(function(event) {
            proc.on(event, self.proc.emit.bind(self.proc, event));
        })

        // FFmpeg information is written to `stderr`. We'll call this
        // the `info` event.
        // `split()` makes sure the parser will get whole lines.
        proc.stderr.pipe(split(/[\r\n]+/)).on('data', self.proc.emit.bind(self.proc, 'info'));

        // We also need to pass `stderr` data to a function that will
        // filter and emit `progress` events.
        proc.stderr.pipe(split(/[\r\n]+/)).on('data', self._handleInfo);

        // Return the process object, in case anyone needs it.
        if (callback)
            callback(null, proc); // no error

        return self;*/
        return self._processOptions(self.options);
    }

  return self;
}

module.exports = FFmpeg_Live;
