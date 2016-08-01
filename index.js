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
        //console.log(key + ":" + self.options[key]);
        processed_options.push(key);
        var val = self.options[key]
        if (val !== null && typeof val !== 'undefined') {
            processed_options.push(val);
        }
    }
    return processed_options;
  }
  self._parseProgress = function(line) {
    // Values, ordered:
    //
    // [current frame, frames per second, q (codec dependant parameter),
    // target size, time mark, bitrate]
    //
    // Regex matches series of digits, 'dot' and colons.
    var progressValues = line.match(/[\d.:]+/g)

    var progress = {
        frame:      progressValues[0],
        fps:        progressValues[1],
        targetSize: progressValues[3],
        timeMark:   progressValues[4],
        kbps:       progressValues[5] || 0,  // in case of "N/A"
    }

    return progress;
  }

  self._parseInputProperties = function(line) {
      // Properties: [duration, start, bitrate]
      // Note: regex matches single ':' chars, so we remove them.
      var values = line.match(/[\d.:]+/g).filter(function(val) {
          return val !== ':';
      });

      var properties = {
          duration:      values[0],
          bitrate_kbps:  values[2]
      }

      return properties;
  }

  self._handleInfo = function(line) {
      var line = line.trim();
      if (line.substring(0, 5) === 'frame') {
          self.proc.emit('progress', self._parseProgress(line));
      }
      if (line.substring(0, 8) === 'Duration') {
          var inputProperties = self._parseInputProperties(line);
          self.properties.input = inputProperties;
          self.proc.emit('properties', {from: 'input', data: inputProperties});
      }
  }
  self.getDevices = function(callback){
      var _raw_devices = [];

      var options ={
          '-list_devices': 'true',
          '-f': 'dshow',
          '-i': 'dummy'
      };
      var opts = self._processOptions(options);

      var proc = spawn('ffmpeg', opts);

      // `self.proc` is the exposed EventEmitter, so we need to pass
      // events and data from the actual process to it.
      var default_events = ['data', 'error','close'];
      default_events.forEach(function(event) {
          proc.on(event, self.proc.emit.bind(self.proc, event));
      })

      proc.stderr.pipe(split(/[\r\n]+/)).on('data',function(device){
        var device = device.trim();

        if (device !== null && typeof device !== 'undefined') {
          if (device.substring(0, 8) === '[dshow @') {
            //remove [[dshow @ xxxxxxxx] text and trim
            var _device = device.replace(/(\[.*?\])/g, '').trim();
            //remove "Alternative nameXXXX"
            var teststring = "Alternative name";//this will only work on WINOS
            if(_device.indexOf(teststring) === -1){
              _raw_devices.push(_device);
            }
          }
        }

      }).on('close',function(){
        //create a function that can group all video items and audio items.
        callback(_raw_devices);
      });
  }

  self.start = function(callback) {

        var opts = self._processOptions(self.options);

        console.log("'ffmpeg " + opts.join(" ")+ "'");
        var proc = spawn('ffmpeg', opts);

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

        return self;
        //return
    }

  return self;
}

module.exports = FFmpeg_Live;
