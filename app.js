// Asegúrate de que el formulario se procese correctamente
document.getElementById("tokenForm").onsubmit = async function(event) {
    event.preventDefault();

    // Obtener los valores del formulario
    const mnem = document.getElementById("mnem").value;
    const totalSupply = parseInt(document.getElementById("totalSupply").value);
    const tokenName = document.getElementById("tokenName").value;
    const unitName = document.getElementById("unitName").value;

    // Conectar al nodo Algod
    const algodServer = "https://testnet-api.algonode.cloud";
    const algodToken = "";
    const algodPort = "";

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    try {
        // Convertir mnemónico a clave secreta
        const creatorAccount = algosdk.mnemonicToSecretKey(mnem);

        // Obtener parámetros de transacción
        const params = await algodClient.getTransactionParams().do();

        // Definir los parámetros del ASA
        const asaOptions = {
            from: creatorAccount.addr,
            total: totalSupply,
            decimals: 0, // Cambia si necesitas decimales
            defaultFrozen: false,
            unitName: unitName,
            assetName: tokenName,
            manager: creatorAccount.addr,
            reserve: creatorAccount.addr,
            freeze: creatorAccount.addr,
            clawback: creatorAccount.addr,
            suggestedParams: params
        };

        // Crear transacción de creación de ASA
        const txn = algosdk.makeAssetCreateTxnWithSuggestedParamsFromObject(asaOptions);

        // Firmar la transacción
        const signedTxn = txn.signTxn(creatorAccount.sk);
        const txId = txn.txID().toString();

        // Enviar la transacción
        await algodClient.sendRawTransaction(signedTxn).do();

        const confirmedTxn = await waitForConfirmation(algodClient, txId, 4);

        // Actualizar el estado en la página
        document.getElementById("status").innerText = `Token creado exitosamente. Transaction ID: ${txId} AssetId ${confirmedTxn["asset-index"]}`;  
    } catch (error) {
        document.getElementById("status").innerText = `Error al crear el token: ${error.message}`;
    }
};

async function waitForConfirmation(algodClient, txId, timeout) {
    const status = await algodClient.status().do();
    const startRound = status["last-round"] + 1;
    let currentRound = startRound;

    while (currentRound < startRound + timeout) {
        const pendingInfo = await algodClient.pendingTransactionInformation(txId).do();
        if (pendingInfo["confirmed-round"] !== null && pendingInfo["confirmed-round"] > 0) {
            return pendingInfo;
        }
        currentRound++;
        await algodClient.statusAfterBlock(currentRound).do();
    }
    throw new Error(`Transaction not confirmed after ${timeout} rounds`);
}