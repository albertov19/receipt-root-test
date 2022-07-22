const Tree = require('merkle-patricia-tree');
const { Receipt } = require('eth-object');
const { encode } = require('eth-util-lite');
const { promisfy } = require('promisfy');
const ethers = require('ethers');

// INPUT
const network = 'moonbase';
const blockHash = '0xf14ec91a69456d822706a946c5c15cf51f19aecb9dad9e1d4f88a9cc7ed964f4';

async function transactions(provider, blockHash) {
  await new Promise((r) => setTimeout(r, 2000));
  const block = await provider.send('eth_getBlockByHash', [blockHash, false]);
  console.log(`Checking block ${parseInt(block.number)} on ${network}`);
  // Just wait a bit so we make sure block is mapped in the offchain DB.

  if (block != null) {
    let receipts1 = [];

    /*
    // Way 1
    for (const txHash of block.transactions) {
      const tx = await provider.getTransaction(txHash);
      const txType = tx.type;
      const receipt = await provider.getTransactionReceipt(txHash);
      const status = receipt.status ? '0x1' : '0x0';
      let innerReceipt = {
        logs: receipt.logs,
        status: status,
        cumulativeGasUsed: receipt.cumulativeGasUsed.toNumber(),
        logsBloom: receipt.logsBloom,
        type: txType,
      };

      receipts1.push(innerReceipt);
    }

    // Build the receipt trie.
    const tree = new Tree();
    await Promise.all(
      receipts1.map((siblingReceipt, index) => {
        let siblingPath = encode(index);
        let serializedReceipt = Receipt.fromRpc(siblingReceipt);
        serializedReceipt = serializedReceipt.serialize();
        return promisfy(tree.put, tree)(siblingPath, serializedReceipt);
      })
    );
    const match = block.receiptsRoot == '0x' + tree._root.toString('hex');
    const color = match ? '\x1b[42m' : '\x1b[41m';
    const message = match ? 'True' : 'False';
    // Onchain receipt root == Offchain receipt root
    console.log(`--------------------------------------------`);
    console.log(`Block Hash: ${blockHash}`);
    console.log(`Block: ${block.number}`);
    console.log(`Onchain: ${block.receiptsRoot}`);
    console.log(`Offchain: 0x${tree._root.toString('hex')}`);
    console.log(`Match: ${color}${message}\x1b[0m`);*/

    // Way 2
    let receipts2 = [];
    receipts2 = await Promise.all(
      block.transactions.map((tx) => provider.send('eth_getTransactionReceipt', [tx]))
    );

    // Build the receipt trie.
    const tree = new Tree();
    await Promise.all(
      receipts2.map((siblingReceipt, index) => {
        let siblingPath = encode(index);
        let serializedReceipt = Receipt.fromRpc(siblingReceipt);
        serializedReceipt = serializedReceipt.serialize();
        return promisfy(tree.put, tree)(siblingPath, serializedReceipt);
      })
    );
    const match = block.receiptsRoot == '0x' + tree._root.toString('hex');
    const color = match ? '\x1b[42m' : '\x1b[41m';
    const message = match ? 'True' : 'False';
    // Onchain receipt root == Offchain receipt root
    console.log(`--------------------------------------------`);
    console.log(`Block Hash: ${blockHash}`);
    console.log(`Block: ${block.number}`);
    console.log(`Onchain: ${block.receiptsRoot}`);
    console.log(`Offchain: 0x${tree._root.toString('hex')}`);
    console.log(`Match: ${color}${message}\x1b[0m`);
  }
}

// data["receipts"] = await Promise.all(data["block"].transactions.map(async (tx) => provider.send("eth_getTransactionReceipt", [tx.hash])))

const main = async () => {
  const networks = {
    stagenet: 'https://rpc.api.moondev.network',
    moonriver: 'https://rpc.api.moonriver.moonbeam.network',
    moonbase: 'https://rpc.api.moonbase.moonbeam.network',
  };

  const provider = new ethers.providers.JsonRpcBatchProvider(networks[network]);

  transactions(provider, blockHash);
};

main();
