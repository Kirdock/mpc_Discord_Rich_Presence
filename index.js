const log = require('fancy-log')

log.info('INFO: Loading...')

const snekfetch = require('snekfetch'),
	  fs = require('fs'),
	  core = require('./core'),
	  events = require('events')

const config = JSON.parse(fs.readFileSync(`./config.json`, {
	encoding: 'utf8'
}))

var mediaEmitter = new events.EventEmitter(),
	active = false;

if (config.port == null) throw new Error('Port is empty (null)!')
const uri = `http://localhost:${config.port}/variables.html`

log.info('INFO: Fully ready')
log.info('INFO: Listening on ' + uri)

mediaEmitter.on('CONNECTED', function (res) {
	console.log('update');
	active = core(res)
})

mediaEmitter.on('ERROR', function (code) {
	if (active){
		process.exit();
	}
	//forever starts the process again but the Discord connection is closed
})

// Functions
function checkMedia() {
	snekfetch.get(uri)
		.then(function (res) {
			mediaEmitter.emit('CONNECTED', res)
		})
		.catch(function (err) {
			mediaEmitter.emit('ERROR', err)
		})
}

global.intloop = setInterval(checkMedia, 1000)
