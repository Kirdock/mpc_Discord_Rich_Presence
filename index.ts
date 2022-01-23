import { Logger } from './logger.js';
import { Client } from 'discord-rpc';
import { updatePresence } from './core.js';
import { config } from './config.js';
import fetch from 'node-fetch';

const clientId = '436465482111909889';
const log = new Logger();
let active: boolean | undefined;
let mpc_update: ReturnType<typeof setTimeout> | undefined;
let rpc: Client;
const uri = `http://localhost:${config.port}/variables.html`;


// If RPC successfully connects to Discord client,
// it will attempt to connect to MPC Web Interface every 15 seconds. 
async function discord_connected(): Promise<void> {
	log.info('INFO: Connected to Discord');
	await fetch_mpc_data();
};

async function fetch_mpc_data(): Promise<void> {
	try{
		const res = await fetch(uri);
		if (!active) {
			log.info(`INFO: Connected to ${res.headers.get('server')}`);
			active = true;
		}
		const htmlText = await res.text();
		await updatePresence(rpc, htmlText);
		mpc_update = setTimeout(fetch_mpc_data, 5_000);
	}
	catch(error) {
		mpc_update = setTimeout(fetch_mpc_data, 15_000);
		if (active) {
			log.info('INFO: MPC closed', error);
			active = false;
			rpc.clearActivity();
		} else if(active === undefined) {
			log.error('ERROR: Error on init', error);
		}
	}
}

// Initiates a new RPC connection to Discord client.
async function initRPC(): Promise<void> {
	rpc = new Client({ transport: 'ipc' });
	rpc.on('ready', async () => {
		await discord_connected();
	});
	
	// @ts-ignore
	rpc.transport.once('close', (error) => {
		log.warn(`WARN: Connection to Discord client was closed.`, JSON.stringify(error));
	});

	// @ts-ignore
	rpc.on('error', error =>{
		log.warn(`ERROR: Connection to Discord has failed. Trying again in 5 seconds...; clientId: ${clientId}`, JSON.stringify(error));
		setTimeout(restart,5000);
	});
	try {
		await rpc.login({clientId});
	} catch(error) {
		log.warn(`ERROR: Login to Discord has failed. Trying again in 5 seconds...; clientId: ${clientId}`, JSON.stringify(error));
		await restart();
	}
}

async function restart(){
	if(mpc_update){
		clearTimeout(mpc_update);
	}
	try {
		await rpc.destroy();
	} catch(error) {
		log.warn(`ERROR: destroying rpc not possible; clientId: ${clientId}`, JSON.stringify(error));
	}
	await initRPC();
}

initRPC();