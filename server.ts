import { Logger, LogLevel } from './models/logger.js';
import { Client } from 'discord-rpc';
import { updatePresence } from './sendActivity.js';
import { config } from './config.js';
import fetch, { Response } from 'node-fetch';

const clientId = '436465482111909889';
const log = new Logger(config.logLevel);
let mpc_update: ReturnType<typeof setTimeout> | undefined;
let rpc: Client;
const uri = `http://localhost:${config.port}/variables.html`;
const checkMPCRunningInterval = 15_000;
const updateInterval = 5_000;

async function startMPCPolling(): Promise<void> {
	if (await isMPCRunning()) {
		log.info(`Connected to WebServer`);
		await fetchMPCData();
	} else {
		log.info(`MPC closed. Trying again after ${checkMPCRunningInterval / 1000} seconds`);
		mpc_update = setTimeout(startMPCPolling, checkMPCRunningInterval);
	}
};

async function isMPCRunning(): Promise<boolean> {
	try{
		await fetch(uri);
		return true;
	} catch (error) {
		return false;
	}
}

async function fetchMPCData(): Promise<void> {
	let res: Response | undefined;
	try {
		res = await fetch(uri);
	} catch {
		log.info('MPC closed');
		rpc.clearActivity();
		setTimeout(startMPCPolling, checkMPCRunningInterval);
	}
	if(res) {
		const htmlText = await res.text();
		await updatePresence(rpc, htmlText);
		mpc_update = setTimeout(fetchMPCData, updateInterval);
	}
}

async function initRPC(): Promise<void> {
	rpc = new Client({ transport: 'ipc' });
	rpc.on('ready', async () => {
		log.info('Connected to Discord');
		await startMPCPolling();
	});
	
	// @ts-ignore
	rpc.transport.once('close', (error) => {
		log.warn(`Connection to Discord client was closed.`, error);
	});

	// @ts-ignore
	rpc.on('error', error =>{
		log.warn(`Connection to Discord has failed. Trying again in 5 seconds...; clientId: ${clientId}`, error);
		setTimeout(restart, 5000);
	});
	try {
		await rpc.login({clientId});
	} catch(error) {
		log.warn(`Login to Discord has failed. Trying again in 5 seconds...; clientId: ${clientId}`, error);
		setTimeout(restart, 5000);
	}
}

async function restart(){
	if(mpc_update){
		clearTimeout(mpc_update);
	}
	try {
		await rpc.destroy();
	} catch(error) {
		log.error(`destroying rpc not possible; clientId: ${clientId}`, error);
	}
	await initRPC();
}

initRPC();