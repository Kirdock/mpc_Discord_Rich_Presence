const log = require('fancy-log')

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
				log.info('INFO: MPC closed');
				active = false;
				destroyRPC();
			}
		});
}

// Initiates a new RPC connection to Discord client.
function initRPC() {
	rpc = new Client({ transport: 'ipc' });
	rpc.on('ready', () => {
		discord_connected();
		rpc.transport.once('close', async () => {
			discord_running = false;
			clearTimeout(mpc_update);
			await destroyRPC();
			log.warn('WARN: Connection to Discord client was closed. Trying again in 5 seconds...');
			setTimeout(initRPC,5000);
		});
	});
	rpc.on('error',error =>{
		log.warn('ERROR: Connection to Discord has failed. Trying again in 5 seconds...','clientId: '+clientId, error);
		setTimeout(initRPC,5000);
	});
	discord_login();
}

function discord_login(){
	rpc.login({clientId}).catch( error => {
		log.warn('WARN: Connection to Discord has failed. Trying again in 5 seconds...','clientId: '+clientId, error);
		setTimeout(discord_login,5000);
	});
}

// Destroys any active RPC connection.
async function destroyRPC() {
	if (!rpc) return;
	await rpc.destroy();
}

// Boots the whole script, attempting to connect
initRPC();