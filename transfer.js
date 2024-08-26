// Función para esperar la confirmación de la transacción
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

// Manejar el formulario de Opt-In
document.getElementById("optInForm").onsubmit = async function(event) {
    event.preventDefault();

    // Obtener los valores del formulario de Opt-In
    const mnemOptIn = document.getElementById("mnemOptIn").value;
    const assetIDOptIn = parseInt(document.getElementById("assetIDOptIn").value);

    // Conectar al nodo Algod
    const algodServer = "https://testnet-api.algonode.cloud";
    const algodToken = "";
    const algodPort = "";

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    try {
        // Convertir mnemónico a clave secreta
        const optInAccount = algosdk.mnemonicToSecretKey(mnemOptIn);

        // Obtener parámetros de transacción
        const params = await algodClient.getTransactionParams().do();

        // Crear transacción de Opt-In
        const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            optInAccount.addr, // Dirección de la cuenta que realiza el Opt-In
            optInAccount.addr, // Opt-In usa la misma dirección para emisor y receptor
            undefined,
            undefined,
            0,  // Monto de transferencia: 0 para Opt-In
            undefined,
            assetIDOptIn,
            params
        );

        // Firmar la transacción
        const signedOptInTxn = optInTxn.signTxn(optInAccount.sk);
        const optInTxId = optInTxn.txID().toString();

        // Enviar la transacción
        await algodClient.sendRawTransaction(signedOptInTxn).do();

        // Esperar la confirmación de la transacción
        await waitForConfirmation(algodClient, optInTxId, 4);

        // Actualizar el estado en la página
        document.getElementById("optInStatus").innerText = `Opt-In realizado exitosamente. Transaction ID: ${optInTxId}`;
    } catch (error) {
        document.getElementById("optInStatus").innerText = `Error en el Opt-In: ${error.message}`;
    }
};

// Manejar el formulario de Transferencia
document.getElementById("transferForm").onsubmit = async function(event) {
    event.preventDefault();

    // Obtener los valores del formulario de transferencia
    const mnem = document.getElementById("mnem").value;
    const receiver = document.getElementById("receiver").value;
    const assetID = parseInt(document.getElementById("assetID").value);
    const amount = parseInt(document.getElementById("amount").value);

    // Conectar al nodo Algod
    const algodServer = "https://testnet-api.algonode.cloud";
    const algodToken = "";
    const algodPort = "";

    const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

    try {
        // Convertir mnemónico a clave secreta
        const senderAccount = algosdk.mnemonicToSecretKey(mnem);

        // Obtener parámetros de transacción
        const params = await algodClient.getTransactionParams().do();

        // Crear transacción de transferencia ASA
        const txn = algosdk.makeAssetTransferTxnWithSuggestedParams(
            senderAccount.addr, // Dirección de la cuenta emisora
            receiver,           // Dirección de la cuenta receptora
            undefined,
            undefined,
            amount,             // Cantidad de tokens a transferir
            undefined,
            assetID,            // Asset ID del token a transferir
            params
        );

        // Firmar la transacción
        const signedTxn = txn.signTxn(senderAccount.sk);
        const txId = txn.txID().toString();

        // Enviar la transacción
        await algodClient.sendRawTransaction(signedTxn).do();

        // Esperar la confirmación de la transacción
        await waitForConfirmation(algodClient, txId, 4);

        // Actualizar el estado en la página
        document.getElementById("status").innerText = `Transferencia realizada exitosamente. Transaction ID: ${txId}`;
    } catch (error) {
        document.getElementById("status").innerText = `Error en la transferencia: ${error.message}`;
    }
};
