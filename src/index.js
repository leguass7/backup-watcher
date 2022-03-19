const events = require("events")
const util = require("util");

const fs = require("fs")

const watchDir = "./watch";
const processedDir = "./done";
  
/* Let's extend events.EventEmitter in order to be able
  to emit and listen for event*/
  
class Watcher extends events.EventEmitter {
  constructor(watchDir, processedDir) {
    super();
    this.watchDir = watchDir;
    this.processedDir = processedDir;
 }

/* Cycles through directory and process any file
found emitting a process event for each one*/

watch() {
  const watcher = this;
    fs.readdir(this.watchDir, function(err, files) {
      if (err) throw err;
      for (let index in files) {
        watcher.emit("process", files[index]);
      }
    });
}

/**
 * Start the directory monitoring leveraging Node's fs.watchFile 
 */
start() {
    var watcher = this;
    fs.w
    fs.watchFile(watchDir, function() {
      watcher.watch();
    });
  }
}
 
/* Let's instantiate our Watcher object 
passing to the constructor our folders path */
let watcher = new Watcher(watchDir, processedDir);


/*Let's use the on method inherited from 
event emitter class to listen for process 
events and move files from source folder 
to destination*/

watcher.on("process", function process(file) {
  const watchFile = this.watchDir + "/" + file;
  const processedFile = this.processedDir + "/" + file.toLowerCase();
  console.log("ARQUIVO:", file)
  fs.copyFile(watchFile, processedFile, function(err) {
    if (err) throw err;
  });
});


/*Start it!!!*/

watcher.start();