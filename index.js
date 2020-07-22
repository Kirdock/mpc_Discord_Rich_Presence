const log = require('fancy-log')
const Discord = require('discord-rpc');
log.info('INFO: Loading...')

const snekfetch = require('snekfetch'),
	{ Client } = require('discord-rpc'),
	updatePresence = require('./core'),
	config = require('./config'),
	clientId = '436465482111909889';

	let active = false,
	mpc_update,
	rpc;

// Checks if port set in config.js is valid.
if (isNaN(config.port)) {
	throw new Error('Port is empty or invalid! Please set a valid port number in \'config.js\' file.');
}

const uri = `http://localhost:${config.port}/variables.html`;

log.info('INFO: Fully ready. Trying to connect to Discord client...');


// If RPC successfully connects to Discord client,
// it will attempt to connect to MPC Web Interface every 15 seconds. 
function discord_connected(){
	log.info('INFO: Connected to Discord');
	discord_running = true;
	fetch_mpc_data();
};

function fetch_mpc_data() {
	snekfetch.get(uri)
		.then(res =>{
			if (!active) {
				log.info(`INFO: Connected to ${res.headers.server}`);
				active = true;
			}
			updatePresence(res, rpc);
			mpc_update = setTimeout(fetch_mpc_data,5000);
		})
		.catch(error =>{
			mpc_update = setTimeout(fetch_mpc_data, 15000);
			if (active) {
				log.info('INFO: MPC closed', error);
				active = false;
				rpc.clearActivity();
			}
		});
}

// Initiates a new RPC connection to Discord client.
function initRPC() {
	rpc = new Client({ transport: 'ipc' });
	rpc.on('ready', () => {
		discord_connected();
	});
	rpc.transport.once('close', (error) => {
		discord_running = false;
		// setTimeout(restart,5000);
		log.warn(`WARN: Connection to Discord client was closed. error ${JSON.stringify(error)}`);
	});
	rpc.on('error',error =>{
		log.warn('ERROR: Connection to Discord has failed. Trying again in 5 seconds...; clientId: '+clientId +' error: ' + JSON.stringify(error));
		setTimeout(restart,5000);
	});
	discord_login();
}

function discord_login(){
	rpc.login({clientId}).catch( (error) => {
		log.warn('ERROR: Login to Discord has failed. Trying again in 5 seconds...; clientId: '+clientId +' error: ' + JSON.stringify(error));
		restart();
	});
}

function restart(){
	if(mpc_update){
		clearTimeout(mpc_update);
	}
	destroyRPC().then(() =>{
		initRPC();
	}).catch(error =>{
		log.warn('ERROR: destroying rps not possible; clientId: '+clientId +' error: ' + JSON.stringify(error));
	});
}

// Destroys any active RPC connection.
async function destroyRPC() {
	return rpc.destroy();
}

// Boots the whole script, attempting to connect
initRPC();