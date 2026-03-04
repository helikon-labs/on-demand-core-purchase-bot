import { sr25519CreateDerive } from '@polkadot-labs/hdkd';
import { entropyToMiniSecret, mnemonicToEntropy } from '@polkadot-labs/hdkd-helpers';
import { getPolkadotSigner } from 'polkadot-api/signer';
import { paseo } from '@polkadot-api/descriptors';
import { createClient } from 'polkadot-api';
import { getWsProvider } from 'polkadot-api/ws-provider';
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat';
import * as dotenv from 'dotenv';

dotenv.config();

async function getOnDemandCoretime() {
    if (!process.env.SEED_PHRASE) {
        throw new Error('SEED_PHRASE not defined inside the .env file.');
    }
    if (!process.env.BLOCK_COUNT) {
        throw new Error('BLOCK_COUNT not defined inside the .env file.');
    }
    if (!process.env.RPC_URL) {
        throw new Error('RPC_URL not defined inside the .env file.');
    }
    if (!process.env.PARA_ID) {
        throw new Error('PARA_ID not defined inside the .env file.');
    }
    if (!process.env.MAX_AMOUNT) {
        throw new Error('MAX_AMOUNT not defined inside the .env file.');
    }
    const seedPhrase = process.env.SEED_PHRASE;
    const rpcURL = process.env.RPC_URL;
    const miniSecret = entropyToMiniSecret(mnemonicToEntropy(seedPhrase));
    const derive = sr25519CreateDerive(miniSecret);
    const keyPair = derive('');
    const signer = getPolkadotSigner(keyPair.publicKey, 'Sr25519', keyPair.sign);

    const paraId = parseInt(process.env.PARA_ID);
    const maxAmount = BigInt(process.env.MAX_AMOUNT);
    const requestCount = parseInt(process.env.BLOCK_COUNT);

    const client = createClient(withPolkadotSdkCompat(getWsProvider(rpcURL)));
    const api = client.getTypedApi(paseo);
    const tx = api.tx.OnDemand.place_order_keep_alive({
        max_amount: maxAmount,
        para_id: paraId,
    });
    for (let i = 0; i < requestCount; i++) {
        console.log(`Submitting request #${i + 1}...`);
        const payload = await tx.signAndSubmit(signer);
        console.log('The tx is now in a best block, view it:');
        console.log(`https://paseo.subscan.io/extrinsic/${payload.txHash}`);
        /*
        tx.signSubmitAndWatch(signer).subscribe({
            next: (event) => {
                console.log('Tx event: ', event.type);
                if (event.type === 'txBestBlocksState') {
                    console.log('The tx is now in a best block, view it:');
                    console.log(`https://paseo.subscan.io/extrinsic/${event.txHash}`);
                }
            },
            error: console.error,
            complete() {
                console.log('Completed.');
            },
        });
        */
    }
    client.destroy();
}

getOnDemandCoretime();
