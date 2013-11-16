(function() {
  window.Tunesmith = {
    Models: {},
    Collections: {},
    Views: {},
    Tools: {},
    init: function() {
      'use strict';
      var audioContext, componentLoaded, e, loaded, loadingView, midi, pitchDetector, recorder, total,
        _this = this;
      loaded = 0;
      total = 3;
      loadingView = new Tunesmith.Views.LoadingView({
        el: '#container'
      });
      loadingView.render();
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;
      window.URL = window.URL || window.webkitURL;
      try {
        audioContext = new window.AudioContext();
      } catch (_error) {
        e = _error;
        alert('No web audio support in this browser!');
      }
      componentLoaded = function() {
        var app, appModel;
        loaded++;
        loadingView.render(loaded, total);
        if (loaded === total) {
          appModel = new Tunesmith.Models.AppModel({
            midi: midi,
            recorder: recorder,
            pitchDetector: pitchDetector
          });
          return app = new Tunesmith.Views.AppView({
            el: $('#container'),
            model: appModel
          });
        }
      };
      midi = new Tunesmith.Models.SoundPlayerModel(componentLoaded, audioContext);
      pitchDetector = new Tunesmith.Models.PitchDetectorModel(componentLoaded, audioContext);
      return recorder = new Tunesmith.Models.RecorderModel(componentLoaded, audioContext);
    }
  };

  $(function() {
    'use strict';
    return Tunesmith.init();
  });

}).call(this);

(function() {
  'use strict';
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Models.SoundPlayerModel = (function(_super) {
    __extends(SoundPlayerModel, _super);

    function SoundPlayerModel() {
      this.stopNote = __bind(this.stopNote, this);
      this.initialize = __bind(this.initialize, this);
      _ref = SoundPlayerModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    SoundPlayerModel.prototype.initialize = function(cb, context) {
      var sounds;
      sounds = {
        metronome: {
          buffers: []
        },
        hiphop_kit: {
          notes: [1, 2, 3]
        },
        live_kit: {
          notes: [1, 2, 3]
        },
        dance_kit: {
          notes: [1, 2, 3]
        },
        piano: {
          notes: [39, 44, 49, 54, 59, 64, 69, 74]
        },
        e_guitar: {
          notes: [44, 49, 54, 59, 64, 69, 74]
        },
        a_guitar: {
          notes: [44, 49, 54, 59, 64, 69, 74]
        },
        bass: {
          notes: [62, 57, 52, 47, 42]
        },
        synth: {
          notes: [44, 49, 54, 59, 64, 69, 74]
        },
        sax: {
          notes: []
        },
        strings: {
          notes: [44, 49, 54, 59, 64, 69, 74]
        }
      };
      this.set('sounds', sounds);
      this.set('context', context);
      this.set('noteEvents', []);
      this.loadBuffer("/audio/metronome/tick.mp3", sounds.metronome.buffers, 0);
      return cb();
    };

    SoundPlayerModel.prototype.loadInstrument = function(name) {
      var i, instrument, note, _i, _len, _ref1, _results;
      console.log("attempting to load " + name);
      instrument = this.get('sounds')[name];
      if (!instrument.buffers) {
        instrument.buffers = [];
        _ref1 = instrument.notes;
        _results = [];
        for (i = _i = 0, _len = _ref1.length; _i < _len; i = ++_i) {
          note = _ref1[i];
          _results.push(this.loadBuffer("/audio/" + name + "/" + note + ".mp3", instrument.buffers, i));
        }
        return _results;
      }
    };

    SoundPlayerModel.prototype.loadBuffer = function(url, destination, i) {
      var request,
        _this = this;
      request = new XMLHttpRequest();
      request.open("GET", url, true);
      request.responseType = "arraybuffer";
      request.onload = function() {
        return _this.get('context').decodeAudioData(request.response, function(buffer) {
          if (!buffer) {
            console.log("error decoding file data for " + url);
            return;
          }
          console.log("Downloaded " + url);
          if (i != null) {
            return destination[i] = buffer;
          } else {
            return destination = buffer;
          }
        }, function(error) {
          return console.error('decodeAudioData error', error);
        });
      };
      request.onerror = function() {
        return console.error("Could not fetch " + url + " from the server.");
      };
      return request.send();
    };

    SoundPlayerModel.prototype.play = function(type, note) {
      var context, index, notes, sounds, source;
      context = this.get('context');
      sounds = this.get('sounds');
      notes = sounds[type].notes;
      index = 0;
      while (notes[index] < note.pitch && index < notes.length - 1) {
        index++;
      }
      if ((notes[index] - note.pitch) > (note.pitch - notes[index - 1])) {
        index--;
      }
      source = context.createBufferSource();
      if (!(sounds[type].buffers && sounds[type].buffers[index])) {
        console.log("instrument not loaded yet");
        return;
      }
      source.buffer = sounds[type].buffers[index];
      source.playbackRate.value = Math.pow(2, (note.pitch - notes[index]) / 12);
      source.gain.value = note.vel / 127;
      source.connect(context.destination);
      source.noteOn(0);
      return this.get('noteEvents').push({
        source: source,
        len: note.len
      });
    };

    SoundPlayerModel.prototype.advance = function() {
      var e, events, stillActive, _i, _len;
      events = this.get('noteEvents');
      stillActive = [];
      for (_i = 0, _len = events.length; _i < _len; _i++) {
        e = events[_i];
        if (e.len) {
          e.len--;
          stillActive.push(e);
        } else {
          this.stopNote(e.source);
        }
      }
      return this.set('noteEvents', stillActive);
    };

    SoundPlayerModel.prototype.stopNote = function(source) {
      var _this = this;
      if (source.gain.value === 0) {
        return source.noteOff(0);
      } else {
        source.gain.value = Math.max(source.gain.value - 0.1, 0);
        return setTimeout(function() {
          return _this.stopNote(source);
        }, 1);
      }
    };

    SoundPlayerModel.prototype.clear = function() {
      var e, _i, _len, _ref1, _results;
      _ref1 = this.get('noteEvents');
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        e = _ref1[_i];
        _results.push(this.stopNote(e.source));
      }
      return _results;
    };

    SoundPlayerModel.prototype.tick = function(loud) {
      var context, source;
      context = this.get('context');
      source = context.createBufferSource();
      source.buffer = this.get('sounds').metronome.buffers[0];
      source.connect(context.destination);
      if (loud) {
        source.gain.value = 2;
      }
      return source.noteOn(0);
    };

    return SoundPlayerModel;

  })(Backbone.Model);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Models.RecorderModel = (function(_super) {
    __extends(RecorderModel, _super);

    function RecorderModel() {
      _ref = RecorderModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    RecorderModel.prototype.initialize = function(cb, context) {
      var _this = this;
      return navigator.getUserMedia({
        audio: true
      }, function(stream) {
        var input;
        input = context.createMediaStreamSource(stream);
        _this.set('recorder', new Recorder(input));
        return cb();
      }, function(e) {
        return console.log("No live audio input: " + e);
      });
    };

    RecorderModel.prototype.getBuffer = function(cb) {
      return this.get('recorder').getBuffer(cb);
    };

    RecorderModel.prototype.record = function() {
      return this.get('recorder').record();
    };

    RecorderModel.prototype.stop = function() {
      return this.get('recorder').stop();
    };

    RecorderModel.prototype.clear = function() {
      return this.get('recorder').clear();
    };

    return RecorderModel;

  })(Backbone.Model);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Models.PitchDetectorModel = (function(_super) {
    __extends(PitchDetectorModel, _super);

    function PitchDetectorModel() {
      _ref = PitchDetectorModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PitchDetectorModel.prototype.initialize = function(cb, context) {
      this.set("context", context);
      this.set("chunkingFactor", 2);
      return cb();
    };

    PitchDetectorModel.prototype.getNote = function(frequency) {
      if (frequency) {
        return Math.round(69 + 12 * Math.log(frequency / 440) / Math.LN2);
      } else {
        return 0;
      }
    };

    PitchDetectorModel.prototype.chunk = function(buffer, tempo, minInterval, chunkingFactor) {
      var chunkLength, end, x, _i, _results;
      chunkLength = Math.round(2646000 / (minInterval * tempo * chunkingFactor));
      end = buffer.length - chunkLength;
      _results = [];
      for (x = _i = 0; chunkLength > 0 ? _i <= end : _i >= end; x = _i += chunkLength) {
        _results.push(buffer.subarray(x, x + chunkLength));
      }
      return _results;
    };

    PitchDetectorModel.prototype.convertToPitches = function(chunks) {
      var YINDetector, chunk, chunkCount, chunkLength, chunkingFactor, pitches, tone, toneAVG, toneAVGcount, _i, _len;
      pitches = [];
      chunkingFactor = this.get('chunkingFactor');
      chunkLength = chunks[0].length;
      YINDetector = YIN({
        butterLength: chunkLength
      });
      toneAVG = 0;
      toneAVGcount = 0;
      chunkCount = 0;
      for (_i = 0, _len = chunks.length; _i < _len; _i++) {
        chunk = chunks[_i];
        chunkCount++;
        tone = YINDetector(chunk).freq;
        if ((0 < tone && tone < 5000)) {
          toneAVG += tone;
          toneAVGcount++;
        }
        if (chunkCount === chunkingFactor) {
          if (toneAVGcount >= (chunkingFactor - 1)) {
            toneAVG /= toneAVGcount;
            pitches.push({
              pitch: this.getNote(toneAVG),
              vel: 128,
              len: 1
            });
          } else {
            pitches.push({
              pitch: 0,
              vel: 0,
              len: 1,
              ac: 0
            });
          }
          toneAVG = 0;
          toneAVGcount = 0;
          chunkCount = 0;
        }
      }
      return pitches;
    };

    PitchDetectorModel.prototype.convertToDrumPitches = function(chunks) {
      var chunk, fft, fft_results, i, mag, max, max_idx, note, pitches, result, results, sum, val, val2, _i, _j, _k, _l, _len, _len1, _len2, _len3;
      pitches = [];
      for (_i = 0, _len = chunks.length; _i < _len; _i++) {
        chunk = chunks[_i];
        chunk = chunk.subarray(0, this.nextPowerOf2(chunk.length) / 2);
        fft = new FFT.complex(chunk.length, false);
        fft_results = new Float32Array(chunk.length * 2);
        fft.simple(fft_results, chunk, 'real');
        results = [];
        for (i = _j = 0, _len1 = fft_results.length; _j < _len1; i = ++_j) {
          val = fft_results[i];
          if ((i % 2) && (i < fft_results.length / 2)) {
            val2 = fft_results[i - 1];
            mag = Math.sqrt(val * val + val2 * val2);
            if (results[Math.floor(30 * i / fft_results.length)]) {
              results[Math.floor(30 * i / fft_results.length)] += mag;
            } else {
              results[Math.floor(30 * i / fft_results.length)] = mag;
            }
          }
        }
        results = results.slice(0, 8);
        max = 0;
        max_idx = 0;
        for (i = _k = 0, _len2 = results.length; _k < _len2; i = ++_k) {
          result = results[i];
          results[i] = Math.floor(result / 200);
          if (results[i] > max) {
            max = results[i];
            max_idx = i;
          }
        }
        sum = 0;
        for (_l = 0, _len3 = results.length; _l < _len3; _l++) {
          result = results[_l];
          sum += result;
        }
        note = {
          pitch: 0,
          vel: 0,
          len: 1
        };
        if (sum > 1) {
          if (max_idx === 0) {
            note = {
              pitch: 1,
              vel: Math.min(110, 4 * sum),
              len: 4
            };
          }
          if (max_idx === 1 || max_idx === 2 || max_idx === 3 || max_idx === 4) {
            note = {
              pitch: 2,
              vel: Math.min(sum, 110),
              len: 4
            };
          }
          if ((results[0] < 2) && (max_idx > 3)) {
            note = {
              pitch: 3,
              vel: Math.min(sum, 110),
              len: 4
            };
          }
        }
        pitches.push(note);
      }
      return pitches;
    };

    PitchDetectorModel.prototype.merge = function(notes) {
      var dnext, i, next, note, sus, _i, _len, _ref1, _ref2;
      sus = {
        pitch: 0
      };
      for (i = _i = 0, _len = notes.length; _i < _len; i = ++_i) {
        note = notes[i];
        next = notes[i + 1] || {
          pitch: 0
        };
        dnext = notes[i + 2] || {
          pitch: 0
        };
        if (note.pitch !== sus.pitch && next.pitch === dnext.pitch) {
          if (Math.abs(note.pitch - next.pitch) === 1) {
            console.log("onset error");
            note.pitch = next.pitch;
          }
        }
        if (note.pitch !== next.pitch && sus.len > 1) {
          if (Math.abs(note.pitch - sus.pitch) === 1) {
            console.log("ending error");
            note.pitch = 0;
            sus.len++;
          }
        }
        if (((note.pitch === (_ref1 = next.pitch + 1) && _ref1 === dnext.pitch + 2)) || ((note.pitch === (_ref2 = next.pitch - 1) && _ref2 === dnext.pitch - 2))) {
          if ((sus.pitch !== note.pitch) && (!notes[i + 3] || notes[i + 3].pitch === 0)) {
            console.log("runner error");
            note.pitch = next.pitch;
            dnext.pitch = next.pitch;
          }
        }
        while (sus.pitch !== 0 && next.pitch !== 0 && note.pitch > sus.pitch + 7 && note.pitch > next.pitch + 7) {
          console.log("octave error");
          note.pitch /= 2;
        }
        if (sus && sus.pitch === note.pitch) {
          note.pitch = 0;
          sus.len++;
        } else {
          sus = note;
        }
      }
      return notes;
    };

    PitchDetectorModel.prototype.mergeDrums = function(notes) {
      var i, note, prev, _i, _len;
      for (i = _i = 0, _len = notes.length; _i < _len; i = ++_i) {
        note = notes[i];
        prev = notes[i - 1];
        if (prev && prev.pitch === note.pitch) {
          note.pitch = 0;
          note.vel = 0;
        }
      }
      return notes;
    };

    PitchDetectorModel.prototype.standardize = function(notes, minInterval) {
      var i, len, nextPowerOf2, note, offBeatCount, onBeatCount, prevPowerOf2, _i, _len;
      notes = notes.slice(2);
      onBeatCount = 0;
      offBeatCount = 0;
      for (i = _i = 0, _len = notes.length; _i < _len; i = ++_i) {
        note = notes[i];
        if (note.pitch) {
          if (i % 2) {
            offBeatCount++;
          } else {
            onBeatCount++;
          }
        }
      }
      if (offBeatCount > onBeatCount) {
        notes = notes.slice(1);
      }
      len = notes.length;
      nextPowerOf2 = this.nextPowerOf2(len);
      prevPowerOf2 = nextPowerOf2 / 2;
      if ((len - prevPowerOf2) < minInterval) {
        notes = notes.slice(0, prevPowerOf2);
      } else {
        while (notes.length < nextPowerOf2) {
          notes.push({
            pitch: 0,
            vel: 0,
            len: 1
          });
        }
      }
      return notes;
    };

    PitchDetectorModel.prototype.convertToDrums = function(buffer, tempo, minInterval) {
      var chunks, drumPitches, merged, stdzd;
      chunks = this.chunk(buffer, tempo, minInterval, 1);
      drumPitches = this.convertToDrumPitches(chunks);
      merged = this.mergeDrums(drumPitches);
      stdzd = this.standardize(merged, minInterval);
      return stdzd;
    };

    PitchDetectorModel.prototype.convertToNotes = function(buffer, tempo, minInterval) {
      var chunks, merged, pitches, stdzd;
      chunks = this.chunk(buffer, tempo, minInterval, 2);
      pitches = this.convertToPitches(chunks);
      merged = this.merge(pitches);
      stdzd = this.standardize(merged, minInterval);
      return stdzd;
    };

    PitchDetectorModel.prototype.nextPowerOf2 = function(n) {
      n--;
      n |= n >> 1;
      n |= n >> 2;
      n |= n >> 4;
      n |= n >> 8;
      n |= n >> 16;
      return ++n;
    };

    return PitchDetectorModel;

  })(Backbone.Model);

}).call(this);

this["Templates"] = this["Templates"] || {};

this["Templates"]["auth"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<h2>";
  if (stack1 = helpers.header) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.header; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</h2>\n<button class='close'>X</button>\n<input class='email' type='text' placeholder='Email'>\n<br><input class='password' type='password' placeholder='Password'>\n<br><button class='submit'>";
  if (stack1 = helpers.button) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.button; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</button>\n<span class='swap'>";
  if (stack1 = helpers.swap) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.swap; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>\n<p class='error'> </p>";
  return buffer;
  });

this["Templates"]["bigText"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<div class=\"selectorBigText\">";
  if (stack1 = helpers.text) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.text; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</div>";
  return buffer;
  });

this["Templates"]["current_tab"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<p>";
  if (stack1 = helpers.state) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.state; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</p>\n\n";
  return buffer;
  });

this["Templates"]["load"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  ";
  stack1 = helpers['if'].call(depth0, depth0.loading, {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "\n    <h2>Loading your songs...\n  ";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <h2>Load a song:</h2>\n    <ul>\n    ";
  stack1 = helpers.each.call(depth0, depth0.songs, {hash:{},inverse:self.program(7, program7, data),fn:self.program(5, program5, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n    </ul>\n  ";
  return buffer;
  }
function program5(depth0,data) {
  
  var buffer = "";
  buffer += "\n      <li class='song'>"
    + escapeExpression((typeof depth0 === functionType ? depth0.apply(depth0) : depth0))
    + "</li>\n    ";
  return buffer;
  }

function program7(depth0,data) {
  
  
  return "\n      <li>No songs to display</li>\n    ";
  }

function program9(depth0,data) {
  
  
  return "\n  <h2>You need to log in before you can load your songs!</h2>\n";
  }

  buffer += "<button class='close'>X</button>\n";
  stack1 = helpers['if'].call(depth0, depth0.user, {hash:{},inverse:self.program(9, program9, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

this["Templates"]["loading"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  


  return "<div class='loading compatibility'>\n  <div class=\"med\"><em>This site works best on Google Chrome.</em></div>\n  <div class=\"small\"><em>Compatiability on other browsers is... unlikely.</em></div>\n</div>\n\n<img class='loading permissionsArrow' src=\"images/clickme.png\">";
  });

this["Templates"]["menu_bar"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, self=this;

function program1(depth0,data) {
  
  
  return "\n  <button class='right med logout'>Log Out</button>\n";
  }

function program3(depth0,data) {
  
  
  return "\n  <button class='right med login'>Log In</button>\n  <button class='right med signup'>Sign Up</button>\n";
  }

  buffer += "<button class='left med newSong'>New Song</button>\n<button class='left med load'>Load Song</button>\n<button class='left med save'>Save Song</button>\n"
    + "\n";
  stack1 = helpers['if'].call(depth0, depth0.user, {hash:{},inverse:self.program(3, program3, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

this["Templates"]["playback_tab"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<p>\n  <span class='tempo down'>⬇</span>\n  <span class='tempo'>";
  if (stack1 = helpers.tempo) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.tempo; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + " BPM</span>\n  <span class='tempo up'>⬆</span>\n</p>\n\n\n";
  return buffer;
  });

this["Templates"]["player"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "";


  return buffer;
  });

this["Templates"]["save"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression, self=this;

function program1(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n  <h2>Save your song:</h2>\n  ";
  stack1 = helpers.unless.call(depth0, depth0.existingTitle, {hash:{},inverse:self.program(4, program4, data),fn:self.program(2, program2, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  buffer += "\n";
  return buffer;
  }
function program2(depth0,data) {
  
  
  return "\n    <input class='title' type='text' placeholder=\"Your Song's Title\">\n    <br><button class='submit'>Save</button>\n  ";
  }

function program4(depth0,data) {
  
  var buffer = "", stack1;
  buffer += "\n    <p class='overwrite'>Would you like to overwrite the song '<span class='title'>";
  if (stack1 = helpers.existingTitle) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.existingTitle; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</span>'?</p><br>\n    <button class='overwrite'>Yes</button>\n    <button class='noOverwrite'>No</button>\n  ";
  return buffer;
  }

function program6(depth0,data) {
  
  
  return "\n  <h2>You need to log in before you can save your songs!</h2>\n";
  }

  buffer += "<button class='close'>X</button>\n";
  stack1 = helpers['if'].call(depth0, depth0.user, {hash:{},inverse:self.program(6, program6, data),fn:self.program(1, program1, data),data:data});
  if(stack1 || stack1 === 0) { buffer += stack1; }
  return buffer;
  });

this["Templates"]["selector"] = Handlebars.template(function (Handlebars,depth0,helpers,partials,data) {
  this.compilerInfo = [4,'>= 1.0.0'];
helpers = this.merge(helpers, Handlebars.helpers); data = data || {};
  var buffer = "", stack1, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<button command=\"";
  if (stack1 = helpers.command) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.command; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" type=\"";
  if (stack1 = helpers.type) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.type; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "\" class=\"selector\">\n  <p class=\"large\">";
  if (stack1 = helpers.name) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.name; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + "</p>\n  <img src=\"images/";
  if (stack1 = helpers.image) { stack1 = stack1.call(depth0, {hash:{},data:data}); }
  else { stack1 = depth0.image; stack1 = typeof stack1 === functionType ? stack1.apply(depth0) : stack1; }
  buffer += escapeExpression(stack1)
    + ".png\"/>\n</button>\n\n\n";
  return buffer;
  });
(function() {
  'use strict';
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Models.AppModel = (function(_super) {
    __extends(AppModel, _super);

    function AppModel() {
      this.getSongList = __bind(this.getSongList, this);
      this.load = __bind(this.load, this);
      this.save = __bind(this.save, this);
      this.signup = __bind(this.signup, this);
      this.login = __bind(this.login, this);
      this.newSong = __bind(this.newSong, this);
      _ref = AppModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    AppModel.prototype.initialize = function() {
      var cliplist,
        _this = this;
      cliplist = new Tunesmith.Collections.ClipCollection();
      cliplist.tools('midi', this.get('midi'));
      cliplist.tools('recorder', this.get('recorder'));
      cliplist.tools('pitchDetector', this.get('pitchDetector'));
      cliplist.tools('metronome', this.get('metronome'));
      this.set('cliplist', cliplist);
      return this.set('auth', new FirebaseSimpleLogin(new Firebase('https://tunesmith.firebaseio.com/'), function(error, user) {
        window.CurrentUser = function() {
          return console.log(_this.get('user'));
        };
        if (error) {
          console.log(error);
          return _this.trigger('authError', error);
        } else if (user) {
          console.log(user);
          _this.set('user', user);
          return _this.trigger('authSuccess');
        } else {
          console.log("Not Logged In");
          return _this.set('user', null);
        }
      }));
    };

    AppModel.prototype.newSong = function(newSong, title) {
      var clip, maxTime, midi, newCL, recorder, _i, _len, _ref1;
      console.log("making a new song with data: ", newSong);
      this.get('cliplist').reset();
      this.get('cliplist').off();
      maxTime = 0;
      if (newSong && newSong.clips) {
        _ref1 = newSong.clips;
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          clip = _ref1[_i];
          console.log(clip);
          if (clip.notes.length > maxTime) {
            maxTime = clip.notes.length;
          }
        }
      }
      newSong = newSong || {};
      newSong.tempo = newSong.tempo || 120;
      recorder = this.get('recorder');
      midi = this.get('midi');
      recorder.stop();
      recorder.clear();
      midi.clear();
      newCL = new Tunesmith.Collections.ClipCollection(newSong.clips);
      newCL.params('tempo', newSong.tempo);
      if (maxTime) {
        newCL.params('maxTime', maxTime);
      }
      newCL.tools('midi', midi);
      newCL.tools('recorder', recorder);
      newCL.tools('pitchDetector', this.get('pitchDetector'));
      newCL.tools('metronome', this.get('metronome'));
      newCL.each(function(clip) {
        return midi.loadInstrument(clip.get('type'));
      });
      this.set('cliplist', newCL);
      this.set('title', title);
      return this.trigger('clearSong');
    };

    AppModel.prototype.login = function(email, pass) {
      console.log("attempting to log in...");
      return this.get('auth').login('password', {
        email: email,
        password: pass
      });
    };

    AppModel.prototype.signup = function(email, pass) {
      var _this = this;
      console.log("attempting to sign up...");
      return this.get('auth').createUser(email, pass, function(error, user) {
        console.log(_this);
        if (error) {
          console.log(error);
          return _this.trigger('authError', error);
        } else {
          console.log(user);
          _this.set('user', user);
          return _this.trigger('authSuccess');
        }
      });
    };

    AppModel.prototype.logout = function() {
      console.log("logging out");
      this.get('auth').logout();
      return this.set('user', null);
    };

    AppModel.prototype.save = function(title) {
      var cliplist, data, fbSong, user;
      cliplist = this.get('cliplist');
      data = {
        tempo: cliplist.params('tempo'),
        clips: []
      };
      cliplist.each(function(clip) {
        return data.clips.push({
          notes: clip.get('notes'),
          type: clip.get('type')
        });
      });
      user = this.get('user');
      console.log("Sending song data for " + title + " to user " + user.uid + " firebase", data);
      fbSong = new Firebase("https://tunesmith.firebaseio.com/songs/" + user.uid + "/" + title);
      fbSong.set(data, function(error) {
        return console.log(error ? error : "Song " + title + " saved!");
      });
      return this.set('title', title);
    };

    AppModel.prototype.load = function(title, success_cb, fail_cb) {
      var fbSong,
        _this = this;
      console.log("loading " + title + " from server");
      fbSong = new Firebase("https://tunesmith.firebaseio.com/songs/" + (this.get('user').uid) + "/" + title);
      return fbSong.once('value', function(song) {
        if (song.val()) {
          return success_cb(song.val(), title);
        } else {
          return fail_cb(song.val(), title);
        }
      });
    };

    AppModel.prototype.getSongList = function(cb) {
      var fbSongs,
        _this = this;
      console.log("getting all of " + (this.get('user').uid) + "'s songs");
      fbSongs = new Firebase("https://tunesmith.firebaseio.com/songs/" + (this.get('user').uid));
      return fbSongs.once('value', function(songs) {
        var song;
        console.log(songs.val());
        console.log((function() {
          var _results;
          _results = [];
          for (song in songs.val()) {
            _results.push(song);
          }
          return _results;
        })());
        return cb((function() {
          var _results;
          _results = [];
          for (song in songs.val()) {
            _results.push(song);
          }
          return _results;
        })());
      });
    };

    return AppModel;

  })(Backbone.Model);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.AppView = (function(_super) {
    __extends(AppView, _super);

    function AppView() {
      _ref = AppView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    AppView.prototype.initialize = function() {
      this.playerView = new Tunesmith.Views.PlayerView({
        collection: this.model.get('cliplist')
      });
      this.clipsView = new Tunesmith.Views.ClipsView({
        collection: this.model.get('cliplist')
      });
      this.menuBarView = new Tunesmith.Views.MenuBarView({
        model: this.model
      });
      this.authView = new Tunesmith.Views.LoginView({
        model: this.model
      });
      this.saveView = new Tunesmith.Views.SaveView({
        model: this.model
      });
      this.loadView = new Tunesmith.Views.LoadView({
        model: this.model
      });
      this.listenTo(this.model, 'authSuccess', function() {
        console.log(this.model.get('user'));
        return this.menuBarView.render();
      });
      this.listenTo(this.model, 'clearSong', this.resetClipViews);
      return this.render();
    };

    AppView.prototype.events = function() {
      return {
        'click header .newSong': function() {
          return this.model.newSong();
        },
        'click header .save': function() {
          return this.saveView.render();
        },
        'click header .load': function() {
          return this.loadView.render();
        },
        'click header .export': function() {
          return this.model["export"]();
        },
        'click header .login': function() {
          return this.authView.render('login');
        },
        'click header .signup': function() {
          return this.authView.render('signup');
        },
        'click header .logout': function() {
          this.model.logout();
          return this.menuBarView.render();
        }
      };
    };

    AppView.prototype.render = function() {
      this.$el.html('');
      this.$el.append(this.playerView.render());
      this.$el.append(this.clipsView.render());
      this.$el.append(this.menuBarView.render());
      return this.$el;
    };

    AppView.prototype.resetClipViews = function() {
      this.playerView.remove();
      this.playerView.unbind();
      clearInterval(this.playerView.interval);
      this.clipsView.remove();
      this.clipsView.unbind();
      this.playerView = new Tunesmith.Views.PlayerView({
        collection: this.model.get('cliplist')
      });
      this.clipsView = new Tunesmith.Views.ClipsView({
        collection: this.model.get('cliplist')
      });
      return this.render();
    };

    return AppView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Models.ClipModel = (function(_super) {
    __extends(ClipModel, _super);

    function ClipModel() {
      this.play = __bind(this.play, this);
      this.initialize = __bind(this.initialize, this);
      _ref = ClipModel.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ClipModel.prototype.initialize = function() {
      return this.set('name', this.formatName(this.get('type')));
    };

    ClipModel.prototype.formatName = function(str) {
      var word;
      return str = ((function() {
        var _i, _len, _ref1, _results;
        _ref1 = str.split('_');
        _results = [];
        for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
          word = _ref1[_i];
          _results.push(this.capitalize(word));
        }
        return _results;
      }).call(this)).join(" ");
    };

    ClipModel.prototype.capitalize = function(str) {
      return str = str.charAt(0).toUpperCase() + str.slice(1);
    };

    ClipModel.prototype.play = function(time) {
      var note, notes;
      notes = this.get('notes');
      if (notes && notes.length) {
        note = notes[time % notes.length];
        if (note && note.pitch) {
          return this.trigger('note', {
            type: this.get('type'),
            note: note
          });
        }
      }
    };

    ClipModel.prototype.clear = function() {
      return this.set('notes', []);
    };

    return ClipModel;

  })(Backbone.Model);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.ClipView = (function(_super) {
    __extends(ClipView, _super);

    function ClipView() {
      this.edit = __bind(this.edit, this);
      this.unflash = __bind(this.unflash, this);
      this.flash = __bind(this.flash, this);
      _ref = ClipView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ClipView.prototype.events = {
      'mouseup': 'edit'
    };

    ClipView.prototype.initialize = function() {
      return this.listenTo(this.model, 'note', this.flash);
    };

    ClipView.prototype.render = function() {
      this.$el = $(Templates['selector']({
        name: this.model.get('name'),
        image: this.model.get('type')
      }));
      this.delegateEvents();
      this.$el.addClass('clip');
      return this.$el;
    };

    ClipView.prototype.flash = function() {
      this.$el.addClass('flash');
      return setTimeout(this.unflash.bind(this), 50);
    };

    ClipView.prototype.unflash = function() {
      return this.$el.removeClass('flash');
    };

    ClipView.prototype.edit = function() {
      return this.model.trigger('edit', this.model);
    };

    return ClipView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Collections.ClipCollection = (function(_super) {
    __extends(ClipCollection, _super);

    function ClipCollection() {
      _ref = ClipCollection.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ClipCollection.prototype.model = Tunesmith.Models.ClipModel;

    ClipCollection.prototype.initialize = function() {
      this._params = {
        tempo: 120,
        minInterval: 4,
        currentTime: 0,
        maxTime: 32,
        recordingDestination: null
      };
      return this._tools = {};
    };

    ClipCollection.prototype.tools = function(name, value) {
      if (value != null) {
        return this._tools[name] = value;
      } else {
        return this._tools[name];
      }
    };

    ClipCollection.prototype.params = function(name, value) {
      if (value != null) {
        return this._params[name] = value;
      } else {
        return this._params[name];
      }
    };

    ClipCollection.prototype.play = function(time) {
      var _this = this;
      return this.each(function(clip) {
        return clip.play(time);
      });
    };

    ClipCollection.prototype.prerecord = function(clip) {
      console.log("Preparing for recording, clip is " + clip);
      this._tools.midi.loadInstrument(clip.get('type'));
      this._tools.midi.clear();
      this._params.currentTime = -4 * this._params.minInterval;
      return this._params.recordingDestination = clip;
    };

    ClipCollection.prototype.record = function() {
      console.log('Recording');
      this.trigger('record');
      return this._tools.recorder.record();
    };

    ClipCollection.prototype.stopRecordingAndAddClip = function() {
      var clip,
        _this = this;
      clip = this._params.recordingDestination;
      console.log('Stopping recording, adding clip #{clip}');
      this._tools.recorder.stop();
      return this._tools.recorder.getBuffer(function(buffer) {
        var notes;
        if (clip.get('type').slice(-4) === "_kit") {
          notes = _this._tools.pitchDetector.convertToDrums(buffer, _this._params.tempo, _this._params.minInterval);
        } else {
          notes = _this._tools.pitchDetector.convertToNotes(buffer, _this._params.tempo, _this._params.minInterval);
        }
        clip.set('notes', notes);
        if (notes.length > _this._params.maxTime) {
          _this._params.maxTime = notes.length;
        }
        _this._params.recordingDestination = null;
        _this._tools.recorder.clear();
        return _this.trigger('finishedRecording');
      });
    };

    return ClipCollection;

  })(Backbone.Collection);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.ClipsView = (function(_super) {
    __extends(ClipsView, _super);

    function ClipsView() {
      _ref = ClipsView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    ClipsView.prototype.className = 'clips clearfix';

    ClipsView.prototype.initialize = function() {
      var _this = this;
      this.listenTo(this.collection, 'finishedRecording', this.render);
      this.listenTo(this.collection, 'edit', this.renderEditor);
      this.listenTo(this.collection, 'record', function() {
        return _this.renderSpecial('record');
      });
      return this.currentTab = new Tunesmith.Views.CurrentTabView();
    };

    ClipsView.prototype.events = {
      'mouseup .selector': 'processClick'
    };

    ClipsView.prototype.processClick = function(e) {
      var command, type;
      command = $(e.target).attr('command') || $(e.target).parent().attr('command');
      type = $(e.target).attr('type') || $(e.target).parent().attr('type');
      return this.renderSpecial(command, type);
    };

    ClipsView.prototype.render = function(buttons, message, bigText) {
      var button, _i, _len,
        _this = this;
      this.$el.html('');
      if (buttons) {
        for (_i = 0, _len = buttons.length; _i < _len; _i++) {
          button = buttons[_i];
          this.$el.append(Templates['selector'](button));
        }
      } else {
        this.$el.append(Templates['selector']({
          name: "Add Track",
          command: "chooseCat",
          image: "record"
        }));
        this.collection.each(function(clip) {
          return _this.$el.append(new Tunesmith.Views.ClipView({
            model: clip
          }).render());
        });
      }
      if (bigText) {
        this.$el.append(Templates['bigText']({
          text: message
        }));
      } else {
        this.$el.append(this.currentTab.render(message));
      }
      return this.$el;
    };

    ClipsView.prototype.renderSpecial = function(command, type) {
      var clip;
      switch (command) {
        case 'cancel':
          return this.render();
        case 'chooseCat':
          this.render([
            {
              command: 'chooseType',
              type: 'instrument',
              name: 'Instrument',
              image: 'instrument'
            }, {
              command: 'chooseType',
              type: 'drum',
              name: 'Drums',
              image: 'drum'
            }, {
              command: 'chooseType',
              type: 'live',
              name: 'Live',
              image: 'live'
            }, {
              command: 'cancel',
              name: 'Cancel',
              image: 'cancel'
            }
          ], "What kind of clip?");
          return this.editTarget = null;
        case 'chooseType':
          if (type === 'instrument') {
            return this.render([
              {
                command: 'prerecord',
                type: 'e_guitar',
                name: 'E. Guitar',
                image: 'e_guitar'
              }, {
                command: 'prerecord',
                type: 'a_guitar',
                name: 'A. Guitar',
                image: 'a_guitar'
              }, {
                command: 'prerecord',
                type: 'bass',
                name: 'Bass',
                image: 'bass'
              }, {
                command: 'prerecord',
                type: 'synth',
                name: 'Synth',
                image: 'synth'
              }, {
                command: 'prerecord',
                type: 'piano',
                name: 'Piano',
                image: 'piano'
              }, {
                command: 'prerecord',
                type: 'sax',
                name: 'Sax',
                image: 'sax'
              }, {
                command: 'prerecord',
                type: 'strings',
                name: 'Strings',
                image: 'strings'
              }, {
                command: 'cancel',
                name: 'Cancel',
                image: 'cancel'
              }
            ], "Which instrument?");
          } else if (type === 'drum') {
            return this.render([
              {
                command: 'prerecord',
                type: 'live_kit',
                name: 'Live',
                image: 'live_kit'
              }, {
                command: 'prerecord',
                type: 'hiphop_kit',
                name: 'Hip Hop',
                image: 'hiphop_kit'
              }, {
                command: 'prerecord',
                type: 'dance_kit',
                name: 'Dance',
                image: 'dance_kit'
              }, {
                command: 'cancel',
                name: 'Cancel',
                image: 'cancel'
              }
            ], "Which drum kit?");
          }
          break;
        case 'prerecord':
          if (this.editTarget) {
            clip = this.editTarget;
            clip.clear();
          } else {
            clip = new Tunesmith.Models.ClipModel({
              type: type,
              notes: []
            });
            this.collection.add(clip);
          }
          this.collection.prerecord(clip);
          return this.render([], "Get ready...", true);
        case 'record':
          return this.render([
            {
              command: 'stopRecording',
              name: "Done",
              image: "stop"
            }
          ], "Recording...", true);
        case 'stopRecording':
          this.collection.stopRecordingAndAddClip();
          return this.render([], "Processing...", true);
        case 'delete':
          console.log(this.editTarget);
          this.collection.remove(this.editTarget);
          return this.render();
        case 'edit':
          return this.render([
            {
              command: 'prerecord',
              name: 'Rerecord',
              image: 'record'
            }, {
              command: 'delete',
              name: 'Delete',
              image: 'delete'
            }, {
              command: 'cancel',
              name: 'Cancel',
              image: 'cancel'
            }
          ], "Editing " + (this.editTarget.get('type')));
      }
    };

    ClipsView.prototype.renderEditor = function(clip) {
      var note, noteSTR, _i, _len, _ref1;
      console.log("editing...", clip);
      noteSTR = "" + (clip.get('notes').length) + ": ";
      _ref1 = clip.get('notes');
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        note = _ref1[_i];
        noteSTR += note.pitch;
        noteSTR += ", ";
      }
      console.log(noteSTR);
      this.editTarget = clip;
      return this.renderSpecial('edit');
    };

    ClipsView.prototype.renderRerecorder = function() {
      this.$el.html(Templates['selector_record']());
      this.$el.append(this.currentTab.render("Rerecording " + (this.editTarget.get('type'))));
      this.editTarget.clear();
      this.collection.record(this.editTarget);
      return this.editTarget = void 0;
    };

    return ClipsView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.LoadingView = (function(_super) {
    __extends(LoadingView, _super);

    function LoadingView() {
      _ref = LoadingView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    LoadingView.prototype.render = function() {
      this.$el.html('');
      this.$el.append(Templates["loading"]());
      this.arrow = this.$el.find('.permissionsArrow');
      this.lowestArrowHeight = this.arrow.position().top;
      this.moveArrow();
      return this.$el;
    };

    LoadingView.prototype.moveArrow = function() {
      var top;
      top = this.arrow.position().top;
      if (top > 10) {
        return this.arrow.animate({
          top: 0
        }, 1000, 'swing', this.moveArrow.bind(this));
      } else if (top === 0) {
        this.lowestArrowHeight *= 2 / 3;
        return this.arrow.animate({
          top: this.lowestArrowHeight
        }, 1000, 'swing', this.moveArrow.bind(this));
      }
    };

    return LoadingView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.CurrentTabView = (function(_super) {
    __extends(CurrentTabView, _super);

    function CurrentTabView() {
      _ref = CurrentTabView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    CurrentTabView.prototype.className = 'current tab';

    CurrentTabView.prototype.render = function(state) {
      state = state || "Displaying all clips";
      this.$el.html(Templates['current_tab']({
        state: state
      }));
      return this.$el;
    };

    return CurrentTabView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.PlayerView = (function(_super) {
    __extends(PlayerView, _super);

    function PlayerView() {
      this.unflash = __bind(this.unflash, this);
      this.stopChangingTempo = __bind(this.stopChangingTempo, this);
      this.startChangingTempo = __bind(this.startChangingTempo, this);
      this.playSound = __bind(this.playSound, this);
      this.advance = __bind(this.advance, this);
      _ref = PlayerView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    PlayerView.prototype.className = "tab playback";

    PlayerView.prototype.initialize = function(params) {
      var _this = this;
      this.listenTo(this.collection, 'note', function(e) {
        return _this.collection.tools('midi').play(e.type, e.note);
      });
      return this.interval = setInterval(this.advance, 60000 / (this.collection.params('tempo') * this.collection.params('minInterval')));
    };

    PlayerView.prototype.events = function() {
      var _this = this;
      return {
        'mousedown .tempo.up': function() {
          return _this.startChangingTempo(1);
        },
        'mousedown .tempo.down': function() {
          return _this.startChangingTempo(-1);
        },
        'mouseup .tempo': function() {
          return _this.stopChangingTempo();
        },
        'mouseout .tempo': function() {
          return _this.stopChangingTempo();
        }
      };
    };

    PlayerView.prototype.advance = function() {
      var minInterval, step;
      minInterval = this.collection.params('minInterval');
      if ((this.collection.params('currentTime') % minInterval) === 0) {
        step = (this.collection.params('currentTime') % (4 * minInterval)) / 4;
        this.tick(step === 0);
      }
      if (this.collection.params('currentTime') < 0) {
        this.collection.tools('midi').clear();
        this.collection.params('currentTime', this.collection.params('currentTime') + 1);
        if (this.collection.params('currentTime') === -1) {
          return setTimeout(this.collection.record(), 60000 / (this.collection.params('tempo') * minInterval));
        }
      } else {
        this.collection.play(this.collection.params('currentTime'));
        this.collection.params('currentTime', (this.collection.params('currentTime') + 1) % this.collection.params('maxTime'));
        return this.collection.tools('midi').advance();
      }
    };

    PlayerView.prototype.playSound = function(type) {
      return this.sounds[type].cloneNode().play();
    };

    PlayerView.prototype.startChangingTempo = function(amt) {
      var _this = this;
      this.collection.params('tempo', this.collection.params('tempo') + amt);
      this.render();
      return this.tempoTimeout = setInterval(function() {
        _this.collection.params('tempo', _this.collection.params('tempo') + amt);
        return _this.render();
      }, 100);
    };

    PlayerView.prototype.stopChangingTempo = function() {
      clearInterval(this.tempoTimeout);
      clearInterval(this.interval);
      return this.interval = setInterval(this.advance, 60000 / (this.collection.params('tempo') * this.collection.params('minInterval')));
    };

    PlayerView.prototype.render = function() {
      this.$el.html(Templates['playback_tab']({
        tempo: this.collection.params('tempo')
      }));
      return this.$el;
    };

    PlayerView.prototype.tick = function(loud) {
      this.flash();
      if (this.collection.params('recordingDestination')) {
        return this.collection.tools('midi').tick(loud);
      }
    };

    PlayerView.prototype.flash = function() {
      this.$el.addClass('flash');
      return setTimeout(this.unflash.bind(this), 50);
    };

    PlayerView.prototype.unflash = function() {
      return this.$el.removeClass('flash');
    };

    return PlayerView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.LoginView = (function(_super) {
    __extends(LoginView, _super);

    function LoginView() {
      _ref = LoginView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    LoginView.prototype.className = 'popup';

    LoginView.prototype.initialize = function() {
      this.listenTo(this.model, 'authError', this.error);
      return this.listenTo(this.model, 'authSuccess', this.close);
    };

    LoginView.prototype.events = {
      'click button.close': 'close',
      'click button.submit': 'submit',
      'click .swap': 'swap',
      'keyup input': function(e) {
        if (e.keyCode === 13) {
          return this.submit();
        }
      },
      'keyup': function(e) {
        if (e.keyCode === 27) {
          return this.close();
        }
      }
    };

    LoginView.prototype.render = function(type) {
      var templateData;
      this.type = type;
      if (type === 'login') {
        templateData = {
          header: "Log in to Tunesmith!",
          button: "Log In",
          swap: "Not registered?  Sign up now to save your songs!"
        };
      } else {
        templateData = {
          header: "Sign up for Tunesmith!",
          button: "Sign Up",
          swap: "Already registered?  Log in to access your songs!"
        };
      }
      $('#greyout').show();
      this.$el.html(Templates['auth'](templateData));
      return this.$el.appendTo('body');
    };

    LoginView.prototype.close = function() {
      this.$el.detach();
      return $('#greyout').hide();
    };

    LoginView.prototype.submit = function() {
      var email, pass;
      this.$el.find('.submit').text("Submitting...");
      email = this.$el.find('.email').val();
      pass = this.$el.find('.password').val();
      console.log('submitting #{email} -- #{pass}');
      if (this.type === 'login') {
        return this.model.login(email, pass);
      } else if (this.type === 'signup') {
        return this.model.signup(email, pass);
      }
    };

    LoginView.prototype.error = function(err) {
      this.render(this.type);
      return this.$el.find('.error').text(err);
    };

    LoginView.prototype.swap = function() {
      if (this.type === 'login') {
        this.type = 'signup';
      } else {
        this.type = 'login';
      }
      return this.render(this.type);
    };

    return LoginView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.MenuBarView = (function(_super) {
    __extends(MenuBarView, _super);

    function MenuBarView() {
      _ref = MenuBarView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    MenuBarView.prototype.tagName = 'header';

    MenuBarView.prototype.render = function() {
      return this.$el.html(Templates["menu_bar"]({
        user: this.model.get('user')
      }));
    };

    return MenuBarView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.SaveView = (function(_super) {
    __extends(SaveView, _super);

    function SaveView() {
      _ref = SaveView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    SaveView.prototype.className = 'popup save';

    SaveView.prototype.events = {
      'click button.close': 'close',
      'click button.submit': 'submit',
      'click button.overwrite': 'save',
      'click button.noOverwrite': function() {
        return this.render();
      },
      'keyup input': function(e) {
        if (e.keyCode === 13) {
          return this.submit();
        }
      },
      'keyup': function(e) {
        if (e.keyCode === 27) {
          return this.close();
        }
      }
    };

    SaveView.prototype.render = function(existingTitle) {
      $('#greyout').show();
      this.$el.html(Templates['save']({
        user: this.model.get('user'),
        existingTitle: existingTitle
      }));
      return this.$el.appendTo('body');
    };

    SaveView.prototype.close = function() {
      this.$el.detach();
      return $('#greyout').hide();
    };

    SaveView.prototype.submit = function() {
      var title,
        _this = this;
      title = this.$el.find('.title').val();
      console.log("title is " + title);
      return this.model.load(title, function(song, title) {
        return _this.render(title);
      }, function(song, title) {
        return _this.save(title);
      });
    };

    SaveView.prototype.save = function(title) {
      if (typeof title === "object") {
        title = this.$el.find('.title').text();
      }
      console.log("title is " + title);
      this.model.save(title);
      return this.close();
    };

    SaveView.prototype.error = function(err) {
      return this.$el.find('.error').text(err);
    };

    return SaveView;

  })(Backbone.View);

}).call(this);

(function() {
  'use strict';
  var _ref,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Tunesmith.Views.LoadView = (function(_super) {
    __extends(LoadView, _super);

    function LoadView() {
      _ref = LoadView.__super__.constructor.apply(this, arguments);
      return _ref;
    }

    LoadView.prototype.className = 'popup load';

    LoadView.prototype.events = {
      'click button.close': 'close',
      'click .song': 'load'
    };

    LoadView.prototype.render = function() {
      var user,
        _this = this;
      $('#greyout').show();
      user = this.model.get('user');
      this.$el.html(Templates['load']({
        user: user,
        loading: true
      }));
      if (user) {
        this.model.getSongList(function(songs) {
          return _this.$el.html(Templates['load']({
            user: user,
            songs: songs
          }));
        });
      }
      return this.$el.appendTo('body');
    };

    LoadView.prototype.close = function() {
      this.$el.detach();
      return $('#greyout').hide();
    };

    LoadView.prototype.load = function(e) {
      console.log("Loading {$(e.target).text()}");
      this.model.load($(e.target).text(), this.model.newSong);
      return this.close();
    };

    LoadView.prototype.error = function(err) {
      return this.$el.find('.error').text(err);
    };

    return LoadView;

  })(Backbone.View);

}).call(this);
