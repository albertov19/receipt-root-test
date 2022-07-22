const Tree = require('merkle-patricia-tree');
const { Receipt } = require('eth-object');
const { encode } = require('eth-util-lite');
const { promisfy } = require('promisfy');
const Web3 = require('web3');

async function transactions(web3, blockHeader) {
  // Just wait a bit so we make sure block is mapped in the offchain DB.
  await new Promise((r) => setTimeout(r, 2000));
  const block = await web3.eth.getBlock(blockHeader.hash);
  if (block != null) {
    let receipts = [];
    for (const txHash of block.transactions) {
      const tx = await web3.eth.getTransaction(txHash);
      const txType = tx.type;
      const receipt = await web3.eth.getTransactionReceipt(txHash);
      const status = receipt.status ? '0x1' : '0x0';
      let innerReceipt = {
        logs: receipt.logs,
        status: status,
        cumulativeGasUsed: receipt.cumulativeGasUsed,
        logsBloom: receipt.logsBloom,
        type: txType,
      };
      receipts.push(innerReceipt);
    }
    // Build the receipt trie.
    const tree = new Tree();
    await Promise.all(
      receipts.map((siblingReceipt, index) => {
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
    console.log(`Block Hash: ${blockHeader.hash}`);
    console.log(`Block: ${block.number}`);
    console.log(`Onhain: ${block.receiptsRoot}`);
    console.log(`Offchain: 0x${tree._root.toString('hex')}`);
    console.log(`Match: ${color}${message}\x1b[0m`);
  }
}

const main = async () => {
  const networks = {
    stagenet: 'wss.api.moondev.network',
    moonriver: 'wss.api.moonriver.moonbeam.network',
    moonbase: 'wss.api.moonbase.moonbeam.network',
  };
  //
  const web3 = new Web3(networks.moonbase);

  var subscription = web3.eth
    .subscribe('newBlockHeaders', function (error, result) {
      if (!error) {
        return;
      }

      console.error(error);
    })
    .on('connected', function (subscriptionId) {
      console.log(subscriptionId);
    })
    .on('data', function (blockHeader) {
      transactions(web3, blockHeader);
    })
    .on('error', console.error);
};
main();
